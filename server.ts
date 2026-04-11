import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import Database from "better-sqlite3";
import cors from "cors";
import bodyParser from "body-parser";

const db = new Database("database.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plan_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(plan_id) REFERENCES plans(id)
  );
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL DEFAULT 0,
    max_agents INTEGER DEFAULT 1,
    max_campaigns INTEGER DEFAULT 1,
    max_leads INTEGER DEFAULT 100,
    features_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin', -- 'admin', 'member'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT NOT NULL,
    system_instruction TEXT NOT NULL,
    personality TEXT,
    faq_json TEXT,
    handoff_trigger TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT NOT NULL,
    agent_id INTEGER,
    initial_method TEXT DEFAULT 'ai',
    transition_rules TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(agent_id) REFERENCES agents(id)
  );
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );
  CREATE TABLE IF NOT EXISTS llm_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_name TEXT,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT,
    phone TEXT,
    address TEXT,
    niche TEXT,
    status TEXT DEFAULT 'pending',
    kanban_status TEXT DEFAULT 'new',
    campaign_id INTEGER,
    last_interaction_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    lead_id INTEGER,
    sender TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT NOT NULL,
    agent_id INTEGER,
    member_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(agent_id) REFERENCES agents(id),
    FOREIGN KEY(member_id) REFERENCES team_members(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  let sock: any = null;
  let qrCodeData: string | null = null;
  let connectionStatus: "connecting" | "open" | "close" | "none" = "none";

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version } = await fetchLatestBaileysVersion();

  const connectToWhatsApp = async () => {
    sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" }),
    });

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        qrCodeData = await QRCode.toDataURL(qr);
      }

      if (connection === "close") {
        connectionStatus = "close";
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === "open") {
        connectionStatus = "open";
        qrCodeData = null;
        console.log("WhatsApp connection opened");
      } else {
        connectionStatus = connection;
      }
    });

    sock.ev.on("creds.update", saveCreds);
  };

  connectToWhatsApp();

  // Middleware to extract account_id (Mock Auth for demo)
  app.use((req, res, next) => {
    const accountId = req.headers['x-account-id'];
    if (accountId) {
      (req as any).accountId = Number(accountId);
    }
    next();
  });

  // Auth API
  app.post("/api/auth/register", (req, res) => {
    const { companyName, name, email, password } = req.body;
    try {
      // Check if it's the first user, make them super admin
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const role = userCount.count === 0 ? 'super_admin' : 'admin';
      
      const accountInfo = db.prepare("INSERT INTO accounts (name) VALUES (?)").run(companyName);
      const accountId = accountInfo.lastInsertRowid;
      const userInfo = db.prepare("INSERT INTO users (account_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)").run(accountId, name, email, password, role);
      res.json({ success: true, accountId, userId: userInfo.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      res.json({ success: true, accountId: user.account_id, user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // API Routes
  app.get("/api/whatsapp/status", (req, res) => {
    res.json({ status: connectionStatus, qr: qrCodeData });
  });

  app.post("/api/whatsapp/logout", async (req, res) => {
    if (sock) {
      await sock.logout();
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "No socket active" });
    }
  });

  app.post("/api/whatsapp/validate", async (req, res) => {
    const { numbers } = req.body;
    if (!sock || connectionStatus !== "open") {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }

    const results = [];
    for (const num of numbers) {
      try {
        const [result] = await sock.onWhatsApp(num);
        results.push({ number: num, exists: !!result?.exists, jid: result?.jid });
      } catch (e) {
        results.push({ number: num, exists: false, error: true });
      }
    }
    res.json(results);
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    const { jid, message } = req.body;
    if (!sock || connectionStatus !== "open") {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }

    try {
      await sock.sendMessage(jid, { text: message });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Agents API
  app.get("/api/agents", (req, res) => {
    const accountId = (req as any).accountId;
    const agents = db.prepare("SELECT * FROM agents WHERE account_id = ?").all(accountId);
    res.json(agents);
  });

  app.post("/api/agents", (req, res) => {
    const accountId = (req as any).accountId;
    const { name, system_instruction, personality, faq_json, handoff_trigger } = req.body;
    const info = db.prepare("INSERT INTO agents (account_id, name, system_instruction, personality, faq_json, handoff_trigger) VALUES (?, ?, ?, ?, ?, ?)").run(
      accountId,
      name, 
      system_instruction,
      personality || null,
      faq_json ? JSON.stringify(faq_json) : null,
      handoff_trigger || null
    );
    res.json({ id: info.lastInsertRowid });
  });

  // Campaigns API
  app.get("/api/campaigns", (req, res) => {
    const accountId = (req as any).accountId;
    const campaigns = db.prepare("SELECT * FROM campaigns WHERE account_id = ?").all(accountId);
    res.json(campaigns);
  });

  app.post("/api/campaigns", (req, res) => {
    const accountId = (req as any).accountId;
    const { name, agent_id, initial_method, transition_rules } = req.body;
    const info = db.prepare("INSERT INTO campaigns (account_id, name, agent_id, initial_method, transition_rules) VALUES (?, ?, ?, ?, ?)").run(
      accountId,
      name,
      agent_id,
      initial_method,
      JSON.stringify(transition_rules)
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/campaigns/:id", (req, res) => {
    const accountId = (req as any).accountId;
    db.prepare("DELETE FROM campaigns WHERE id = ? AND account_id = ?").run(req.params.id, accountId);
    res.json({ success: true });
  });

  app.delete("/api/agents/:id", (req, res) => {
    const accountId = (req as any).accountId;
    db.prepare("DELETE FROM agents WHERE id = ? AND account_id = ?").run(req.params.id, accountId);
    res.json({ success: true });
  });

  // Team API
  app.get("/api/team", (req, res) => {
    const accountId = (req as any).accountId;
    const team = db.prepare("SELECT * FROM team_members WHERE account_id = ?").all(accountId);
    res.json(team);
  });

  app.post("/api/team", (req, res) => {
    const accountId = (req as any).accountId;
    const { name, role, email } = req.body;
    const info = db.prepare("INSERT INTO team_members (account_id, name, role, email) VALUES (?, ?, ?, ?)").run(accountId, name, role, email);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/team/:id", (req, res) => {
    const accountId = (req as any).accountId;
    db.prepare("DELETE FROM team_members WHERE id = ? AND account_id = ?").run(req.params.id, accountId);
    res.json({ success: true });
  });

  // LLM Credentials API
  app.get("/api/credentials", (req, res) => {
    const accountId = (req as any).accountId;
    const creds = db.prepare("SELECT * FROM llm_credentials WHERE account_id = ?").all(accountId);
    res.json(creds);
  });

  app.post("/api/credentials", (req, res) => {
    const accountId = (req as any).accountId;
    const { provider, name, api_key, model_name } = req.body;
    const info = db.prepare("INSERT INTO llm_credentials (account_id, provider, name, api_key, model_name) VALUES (?, ?, ?, ?, ?)").run(accountId, provider, name, api_key, model_name);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/credentials/:id/activate", (req, res) => {
    const accountId = (req as any).accountId;
    const { provider } = req.body;
    db.prepare("UPDATE llm_credentials SET is_active = 0 WHERE provider = ? AND account_id = ?").run(provider, accountId);
    db.prepare("UPDATE llm_credentials SET is_active = 1 WHERE id = ? AND account_id = ?").run(req.params.id, accountId);
    res.json({ success: true });
  });

  app.delete("/api/credentials/:id", (req, res) => {
    const accountId = (req as any).accountId;
    db.prepare("DELETE FROM llm_credentials WHERE id = ? AND account_id = ?").run(req.params.id, accountId);
    res.json({ success: true });
  });

  // Kanban API
  app.patch("/api/leads/:id/kanban", (req, res) => {
    const accountId = (req as any).accountId;
    const { kanban_status } = req.body;
    db.prepare("UPDATE leads SET kanban_status = ? WHERE id = ? AND account_id = ?").run(kanban_status, req.params.id, accountId);
    res.json({ success: true });
  });

  // Schedules API
  app.get("/api/schedules", (req, res) => {
    const accountId = (req as any).accountId;
    const schedules = db.prepare(`
      SELECT s.*, a.name as agent_name, t.name as member_name 
      FROM schedules s
      LEFT JOIN agents a ON s.agent_id = a.id
      LEFT JOIN team_members t ON s.member_id = t.id
      WHERE s.account_id = ?
      ORDER BY s.created_at DESC
    `).all(accountId);
    res.json(schedules);
  });

  app.post("/api/schedules", (req, res) => {
    const accountId = (req as any).accountId;
    const { name, agent_id, member_id, description } = req.body;
    const info = db.prepare("INSERT INTO schedules (account_id, name, agent_id, member_id, description) VALUES (?, ?, ?, ?, ?)").run(
      accountId,
      name,
      agent_id || null,
      member_id || null,
      description || null
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/schedules/:id", (req, res) => {
    const accountId = (req as any).accountId;
    db.prepare("DELETE FROM schedules WHERE id = ? AND account_id = ?").run(req.params.id, accountId);
    res.json({ success: true });
  });

  // Leads API
  app.get("/api/leads", (req, res) => {
    const accountId = (req as any).accountId;
    const leads = db.prepare("SELECT * FROM leads WHERE account_id = ? ORDER BY created_at DESC").all(accountId);
    res.json(leads);
  });

  app.get("/api/messages", (req, res) => {
    const accountId = (req as any).accountId;
    const messages = db.prepare(`
      SELECT m.*, l.name as lead_name 
      FROM messages m 
      JOIN leads l ON m.lead_id = l.id 
      WHERE m.account_id = ?
      ORDER BY m.created_at DESC
    `).all(accountId);
    res.json(messages);
  });

  app.post("/api/messages/save", (req, res) => {
    const accountId = (req as any).accountId;
    const { lead_id, sender, content } = req.body;
    const info = db.prepare("INSERT INTO messages (account_id, lead_id, sender, content) VALUES (?, ?, ?, ?)").run(accountId, lead_id, sender, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/leads", (req, res) => {
    const accountId = (req as any).accountId;
    const { leads } = req.body;
    const insert = db.prepare("INSERT INTO leads (account_id, name, phone, address, niche) VALUES (?, ?, ?, ?, ?)");
    const transaction = db.transaction((leadsList) => {
      for (const lead of leadsList) {
        insert.run(accountId, lead.name, lead.phone, lead.address, lead.niche);
      }
    });
    transaction(leads);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const accountId = (req as any).accountId;
    
    const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE account_id = ?").get(accountId) as any;
    const validatedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE account_id = ? AND status != 'pending'").get(accountId) as any;
    
    const aiMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE account_id = ? AND sender = 'ai'").get(accountId) as any;
    const humanMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE account_id = ? AND sender = 'human'").get(accountId) as any;
    const leadMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE account_id = ? AND sender = 'lead'").get(accountId) as any;
    const totalMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE account_id = ?").get(accountId) as any;

    const agentPerformance = db.prepare(`
      SELECT a.name, COUNT(m.id) as message_count
      FROM messages m
      JOIN leads l ON m.lead_id = l.id
      JOIN campaigns c ON l.campaign_id = c.id
      JOIN agents a ON c.agent_id = a.id
      WHERE m.account_id = ? AND m.sender = 'ai'
      GROUP BY a.id
    `).all(accountId);

    // Activity by day (last 7 days)
    const activityByDay = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM messages
      WHERE account_id = ? AND created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(accountId);

    res.json({
      totalLeads: totalLeads.count,
      validationRate: totalLeads.count > 0 ? (validatedLeads.count / totalLeads.count) * 100 : 0,
      messages: {
        ai: aiMessages.count,
        human: humanMessages.count,
        lead: leadMessages.count,
        total: totalMessages.count
      },
      responseRate: totalMessages.count > 0 ? (leadMessages.count / totalMessages.count) * 100 : 0,
      agentPerformance,
      activityByDay
    });
  });

  // Super Admin API
  app.get("/api/admin/accounts", (req, res) => {
    const accounts = db.prepare(`
      SELECT a.*, p.name as plan_name, (SELECT COUNT(*) FROM users u WHERE u.account_id = a.id) as user_count
      FROM accounts a
      LEFT JOIN plans p ON a.plan_id = p.id
    `).all();
    res.json(accounts);
  });

  app.get("/api/admin/plans", (req, res) => {
    const plans = db.prepare("SELECT * FROM plans").all();
    res.json(plans);
  });

  app.post("/api/admin/plans", (req, res) => {
    const { name, price, max_agents, max_campaigns, max_leads, features_json } = req.body;
    const info = db.prepare("INSERT INTO plans (name, price, max_agents, max_campaigns, max_leads, features_json) VALUES (?, ?, ?, ?, ?, ?)").run(
      name, price, max_agents, max_campaigns, max_leads, JSON.stringify(features_json)
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/admin/accounts/:id/plan", (req, res) => {
    const { plan_id } = req.body;
    db.prepare("UPDATE accounts SET plan_id = ? WHERE id = ?").run(plan_id, req.params.id);
    res.json({ success: true });
  });

  // Seed initial plans if none exist
  const planCount = db.prepare("SELECT COUNT(*) as count FROM plans").get() as any;
  if (planCount.count === 0) {
    db.prepare("INSERT INTO plans (name, price, max_agents, max_campaigns, max_leads, features_json) VALUES (?, ?, ?, ?, ?, ?)").run(
      'Gratuito', 0, 1, 1, 100, JSON.stringify(['Suporte Básico', '1 Agente IA', '1 Campanha'])
    );
    db.prepare("INSERT INTO plans (name, price, max_agents, max_campaigns, max_leads, features_json) VALUES (?, ?, ?, ?, ?, ?)").run(
      'Pro', 97, 5, 10, 1000, JSON.stringify(['Suporte Prioritário', '5 Agentes IA', '10 Campanhas', 'Handoff Ilimitado'])
    );
    db.prepare("INSERT INTO plans (name, price, max_agents, max_campaigns, max_leads, features_json) VALUES (?, ?, ?, ?, ?, ?)").run(
      'Enterprise', 297, 50, 100, 10000, JSON.stringify(['Suporte Dedicado', 'Agentes Ilimitados', 'Campanhas Ilimitadas', 'API Access'])
    );
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
