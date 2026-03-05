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
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    system_instruction TEXT NOT NULL,
    personality TEXT,
    faq_json TEXT,
    handoff_trigger TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    agent_id INTEGER,
    initial_method TEXT DEFAULT 'ai', -- 'ai' or 'direct'
    transition_rules TEXT, -- JSON string for rules
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES agents(id)
  );
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS llm_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL, -- 'openai', 'groq', 'gemini'
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_name TEXT,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    address TEXT,
    niche TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'invalid'
    kanban_status TEXT DEFAULT 'new', -- 'new', 'contacted', 'negotiating', 'closed', 'lost'
    campaign_id INTEGER,
    last_interaction_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    sender TEXT, -- 'ai', 'human', 'lead'
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    agent_id INTEGER,
    member_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    const agents = db.prepare("SELECT * FROM agents").all();
    res.json(agents);
  });

  app.post("/api/agents", (req, res) => {
    const { name, system_instruction, personality, faq_json, handoff_trigger } = req.body;
    const info = db.prepare("INSERT INTO agents (name, system_instruction, personality, faq_json, handoff_trigger) VALUES (?, ?, ?, ?, ?)").run(
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
    const campaigns = db.prepare("SELECT * FROM campaigns").all();
    res.json(campaigns);
  });

  app.post("/api/campaigns", (req, res) => {
    const { name, agent_id, initial_method, transition_rules } = req.body;
    const info = db.prepare("INSERT INTO campaigns (name, agent_id, initial_method, transition_rules) VALUES (?, ?, ?, ?)").run(
      name,
      agent_id,
      initial_method,
      JSON.stringify(transition_rules)
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/campaigns/:id", (req, res) => {
    db.prepare("DELETE FROM campaigns WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/agents/:id", (req, res) => {
    db.prepare("DELETE FROM agents WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Team API
  app.get("/api/team", (req, res) => {
    const team = db.prepare("SELECT * FROM team_members").all();
    res.json(team);
  });

  app.post("/api/team", (req, res) => {
    const { name, role, email } = req.body;
    const info = db.prepare("INSERT INTO team_members (name, role, email) VALUES (?, ?, ?)").run(name, role, email);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/team/:id", (req, res) => {
    db.prepare("DELETE FROM team_members WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // LLM Credentials API
  app.get("/api/credentials", (req, res) => {
    const creds = db.prepare("SELECT * FROM llm_credentials").all();
    res.json(creds);
  });

  app.post("/api/credentials", (req, res) => {
    const { provider, name, api_key, model_name } = req.body;
    const info = db.prepare("INSERT INTO llm_credentials (provider, name, api_key, model_name) VALUES (?, ?, ?, ?)").run(provider, name, api_key, model_name);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/credentials/:id/activate", (req, res) => {
    const { provider } = req.body;
    db.prepare("UPDATE llm_credentials SET is_active = 0 WHERE provider = ?").run(provider);
    db.prepare("UPDATE llm_credentials SET is_active = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/credentials/:id", (req, res) => {
    db.prepare("DELETE FROM llm_credentials WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Kanban API
  app.patch("/api/leads/:id/kanban", (req, res) => {
    const { kanban_status } = req.body;
    db.prepare("UPDATE leads SET kanban_status = ? WHERE id = ?").run(kanban_status, req.params.id);
    res.json({ success: true });
  });

  // Schedules API
  app.get("/api/schedules", (req, res) => {
    const schedules = db.prepare(`
      SELECT s.*, a.name as agent_name, t.name as member_name 
      FROM schedules s
      LEFT JOIN agents a ON s.agent_id = a.id
      LEFT JOIN team_members t ON s.member_id = t.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(schedules);
  });

  app.post("/api/schedules", (req, res) => {
    const { name, agent_id, member_id, description } = req.body;
    const info = db.prepare("INSERT INTO schedules (name, agent_id, member_id, description) VALUES (?, ?, ?, ?)").run(
      name,
      agent_id || null,
      member_id || null,
      description || null
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/schedules/:id", (req, res) => {
    db.prepare("DELETE FROM schedules WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Leads API
  app.get("/api/leads", (req, res) => {
    const leads = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
    res.json(leads);
  });

  app.get("/api/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, l.name as lead_name 
      FROM messages m 
      JOIN leads l ON m.lead_id = l.id 
      ORDER BY m.created_at DESC
    `).all();
    res.json(messages);
  });

  app.post("/api/messages/save", (req, res) => {
    const { lead_id, sender, content } = req.body;
    const info = db.prepare("INSERT INTO messages (lead_id, sender, content) VALUES (?, ?, ?)").run(lead_id, sender, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/leads", (req, res) => {
    const { leads } = req.body;
    const insert = db.prepare("INSERT INTO leads (name, phone, address, niche) VALUES (?, ?, ?, ?)");
    const transaction = db.transaction((leadsList) => {
      for (const lead of leadsList) {
        insert.run(lead.name, lead.phone, lead.address, lead.niche);
      }
    });
    transaction(leads);
    res.json({ success: true });
  });

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
