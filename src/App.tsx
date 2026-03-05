import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users, 
  MessageSquare, 
  Settings, 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  XCircle,
  QrCode,
  RefreshCw,
  MapPin,
  Bot,
  MessagesSquare,
  Calendar
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Lead {
  id?: number;
  name: string;
  phone: string;
  address: string;
  niche: string;
  status: string;
  kanban_status?: string;
}

interface Message {
  id: number;
  lead_id: number;
  lead_name: string;
  sender: 'ai' | 'human' | 'lead';
  content: string;
  created_at: string;
}

interface TeamMember {
  id?: number;
  name: string;
  role: string;
  email: string;
}

interface LLMCredential {
  id?: number;
  provider: string;
  name: string;
  api_key: string;
  model_name?: string;
  is_active: number;
}

interface Schedule {
  id?: number;
  name: string;
  agent_id?: number;
  member_id?: number;
  agent_name?: string;
  member_name?: string;
  description?: string;
  created_at?: string;
}

interface Agent {
  id?: number;
  name: string;
  system_instruction: string;
  personality?: string;
  faq_json?: string;
  handoff_trigger?: string;
}

interface Campaign {
  id?: number;
  name: string;
  agent_id: number;
  initial_method: 'ai' | 'direct';
  transition_rules: any;
}

interface WhatsAppStatus {
  status: 'connecting' | 'open' | 'close' | 'none';
  qr: string | null;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    )}
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
  </button>
);

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'search' | 'leads' | 'agents' | 'whatsapp' | 'campaigns' | 'settings' | 'kanban' | 'messages' | 'agenda'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'credentials' | 'team'>('credentials');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [credentials, setCredentials] = useState<LLMCredential[]>([]);
  const [wsStatus, setWsStatus] = useState<WhatsAppStatus>({ status: 'none', qr: null });
  const [loading, setLoading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Agent Form State
  const [newAgent, setNewAgent] = useState({ 
    name: '', 
    system_instruction: '',
    personality: 'Profissional e amigável',
    faq: [{ q: '', a: '' }],
    handoff_trigger: 'Quero falar com um humano'
  });

  // Campaign Form State
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    agent_id: 0,
    initial_method: 'ai' as 'ai' | 'direct',
    transition_rules: {
      after_first_response: 'continue_ai',
      on_keyword: 'handoff'
    }
  });

  // Team Form State
  const [newMember, setNewMember] = useState({ name: '', role: '', email: '' });

  // Credentials Form State
  const [newCred, setNewCred] = useState({ provider: 'openai', name: '', api_key: '', model_name: '' });

  // Schedule Form State
  const [newSchedule, setNewSchedule] = useState({ name: '', agent_id: 0, member_id: 0, description: '' });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const fetchLeads = async () => {
    const res = await fetch('/api/leads');
    const data = await res.json();
    setLeads(data);
  };

  const fetchAgents = async () => {
    const res = await fetch('/api/agents');
    const data = await res.json();
    setAgents(data);
  };

  const fetchCampaigns = async () => {
    const res = await fetch('/api/campaigns');
    const data = await res.json();
    setCampaigns(data);
  };

  const fetchTeam = async () => {
    const res = await fetch('/api/team');
    const data = await res.json();
    setTeam(data);
  };

  const fetchCredentials = async () => {
    const res = await fetch('/api/credentials');
    const data = await res.json();
    setCredentials(data);
  };

  const fetchMessages = async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();
    setMessages(data);
  };

  const fetchSchedules = async () => {
    const res = await fetch('/api/schedules');
    const data = await res.json();
    setSchedules(data);
  };

  const fetchWsStatus = async () => {
    const res = await fetch('/api/whatsapp/status');
    const data = await res.json();
    setWsStatus(data);
  };

  useEffect(() => {
    fetchLeads();
    fetchAgents();
    fetchCampaigns();
    fetchTeam();
    fetchCredentials();
    fetchMessages();
    fetchSchedules();
    const interval = setInterval(fetchWsStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Encontre 10 empresas do nicho "${searchQuery}" com nome, telefone e endereço. Retorne APENAS um array JSON de objetos com as chaves: name, phone, address.`,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });

      // Try to parse JSON from response
      const text = response.text || '';
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveLeads = async () => {
    setLoading(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: searchResults.map(r => ({ ...r, niche: searchQuery })) })
      });
      setSearchResults([]);
      fetchLeads();
      setActiveTab('leads');
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    if (!newAgent.name || !newAgent.system_instruction) return;
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newAgent,
        faq_json: newAgent.faq.filter(f => f.q && f.a)
      })
    });
    setNewAgent({ 
      name: '', 
      system_instruction: '',
      personality: 'Profissional e amigável',
      faq: [{ q: '', a: '' }],
      handoff_trigger: 'Quero falar com um humano'
    });
    fetchAgents();
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.agent_id) return;
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCampaign)
    });
    setNewCampaign({
      name: '',
      agent_id: 0,
      initial_method: 'ai',
      transition_rules: {
        after_first_response: 'continue_ai',
        on_keyword: 'handoff'
      }
    });
    fetchCampaigns();
  };

  const deleteCampaign = async (id: number) => {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  };

  const createMember = async () => {
    if (!newMember.name) return;
    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember)
    });
    setNewMember({ name: '', role: '', email: '' });
    fetchTeam();
  };

  const deleteMember = async (id: number) => {
    await fetch(`/api/team/${id}`, { method: 'DELETE' });
    fetchTeam();
  };

  const createCredential = async () => {
    if (!newCred.name || !newCred.api_key) return;
    await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCred)
    });
    setNewCred({ provider: 'openai', name: '', api_key: '', model_name: '' });
    fetchCredentials();
  };

  const activateCredential = async (id: number, provider: string) => {
    await fetch(`/api/credentials/${id}/activate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    fetchCredentials();
  };

  const deleteCredential = async (id: number) => {
    await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
    fetchCredentials();
  };

  const createSchedule = async () => {
    if (!newSchedule.name) return;
    await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSchedule)
    });
    setNewSchedule({ name: '', agent_id: 0, member_id: 0, description: '' });
    fetchSchedules();
  };

  const deleteSchedule = async (id: number) => {
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  const updateKanban = async (id: number, status: string) => {
    await fetch(`/api/leads/${id}/kanban`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kanban_status: status })
    });
    fetchLeads();
  };

  const deleteAgent = async (id: number) => {
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    fetchAgents();
  };

  const sendBroadcast = async (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    setLoading(true);
    for (const lead of leads) {
      if (lead.status === 'pending' && lead.phone) {
        try {
          // 1. Generate message with AI
          const aiResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Você é um assistente comercial com a seguinte instrução: "${agent.system_instruction}". Escreva uma mensagem curta e persuasiva para o cliente "${lead.name}" da empresa "${lead.address}". Não use placeholders, escreva a mensagem final.`,
          });

          const message = aiResponse.text;

          // 2. Send via WhatsApp
          // Clean phone number (remove non-digits)
          const cleanPhone = lead.phone.replace(/\D/g, '');
          const jid = `${cleanPhone}@s.whatsapp.net`;

          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jid, message })
          });

          // 3. Save message to DB
          await fetch('/api/messages/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: lead.id, sender: 'ai', content: message })
          });
        } catch (e) {
          console.error("Broadcast error for lead", lead.name, e);
        }
      }
    }
    setLoading(false);
    fetchMessages();
    alert("Disparo concluído!");
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Send size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Wasenderbr</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={MessagesSquare} label="Mensagens" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
          <SidebarItem icon={Bot} label="Agentes IA" active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} />
          <SidebarItem icon={LayoutDashboard} label="Kanban" active={activeTab === 'kanban'} onClick={() => setActiveTab('kanban')} />
          <SidebarItem icon={Calendar} label="Agenda" active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} />
          <SidebarItem icon={Search} label="Captar Leads" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <SidebarItem icon={Users} label="Meus Leads" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
          <SidebarItem icon={MessageSquare} label="Campanhas" active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')} />
          <SidebarItem icon={QrCode} label="Conexão WhatsApp" active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')} />
          <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="mt-auto">
          <div className={cn(
            "p-4 rounded-2xl flex items-center gap-3",
            wsStatus.status === 'open' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}>
            <div className={cn("w-2 h-2 rounded-full", wsStatus.status === 'open' ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {wsStatus.status === 'open' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold text-slate-900">Bem-vindo ao Wasenderbr</h2>
                <p className="text-slate-500 mt-1">Gerencie sua captação e automação de vendas.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total de Leads</p>
                      <h3 className="text-3xl font-bold mt-1">{leads.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Users size={24} />
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Agentes Ativos</p>
                      <h3 className="text-3xl font-bold mt-1">{agents.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                      <Bot size={24} />
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Status WhatsApp</p>
                      <h3 className="text-xl font-bold mt-1 uppercase">{wsStatus.status === 'open' ? 'Conectado' : 'Desconectado'}</h3>
                    </div>
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      wsStatus.status === 'open' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      <MessageSquare size={24} />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">Últimos Leads Captados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-4 px-4">Nome</th>
                        <th className="pb-4 px-4">Telefone</th>
                        <th className="pb-4 px-4">Nicho</th>
                        <th className="pb-4 px-4">Data</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {leads.slice(0, 5).map((lead, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-medium">{lead.name}</td>
                          <td className="py-4 px-4 text-slate-500 font-mono">{lead.phone}</td>
                          <td className="py-4 px-4"><span className="px-2 py-1 bg-slate-100 rounded-lg text-xs">{lead.niche}</span></td>
                          <td className="py-4 px-4 text-slate-400">Recente</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header>
                <h2 className="text-3xl font-bold">Captar Leads</h2>
                <p className="text-slate-500">Extraia dados reais do Google Maps por nicho e localização.</p>
              </header>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Sugestões de Nichos</h3>
                  <span className="text-xs text-slate-400">Palavras-chave para busca</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { n: 'Restaurantes', k: 'pizzaria, massa, culinária' },
                    { n: 'Dentistas', k: 'odonto, clareamento, implante' },
                    { n: 'Mecânicas', k: 'oficina, revisão, motor' },
                    { n: 'Estética', k: 'salão, manicure, massagem' },
                    { n: 'Pet Shops', k: 'veterinário, ração, tosa' },
                    { n: 'Academias', k: 'fitness, crossfit, treino' },
                    { n: 'Imobiliárias', k: 'aluguel, venda, corretor' },
                    { n: 'Advogados', k: 'jurídico, causas, direito' },
                    { n: 'Móveis', k: 'planejados, decoração, sofá' },
                    { n: 'Veículos', k: 'carros, seminovos, revenda' }
                  ].map((niche, i) => (
                    <button 
                      key={i}
                      onClick={() => setSearchQuery(`${niche.n} em São Paulo`)}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left hover:border-emerald-500 transition-all group"
                    >
                      <p className="text-sm font-bold group-hover:text-emerald-600">{niche.n}</p>
                      <p className="text-[10px] text-slate-400 truncate">{niche.k}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Ex: Restaurantes em São Paulo, Dentistas no Rio..."
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                    Pesquisar
                  </button>
                </div>
              </Card>

              {searchResults.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">{searchResults.length} Resultados encontrados</h3>
                    <button
                      onClick={saveLeads}
                      disabled={loading}
                      className="px-6 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2"
                    >
                      <Plus size={20} />
                      Salvar na Minha Lista
                    </button>
                  </div>
                  <div className="space-y-4">
                    {searchResults.map((res, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <h4 className="font-bold">{res.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {res.address}</span>
                            <span className="font-mono">{res.phone}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'leads' && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Meus Leads</h2>
                  <p className="text-slate-500">Lista de contatos captados e validados.</p>
                </div>
                <div className="flex gap-2">
                   <select 
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                    onChange={(e) => {
                      if (e.target.value) sendBroadcast(Number(e.target.value));
                    }}
                   >
                    <option value="">Disparar com Agente...</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                   </select>
                </div>
              </header>

              <Card>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Nome</th>
                      <th className="py-4 px-6">Telefone</th>
                      <th className="py-4 px-6">Endereço</th>
                      <th className="py-4 px-6">Nicho</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {leads.map((lead, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-medium">{lead.name}</td>
                        <td className="py-4 px-6 text-slate-500 font-mono">{lead.phone}</td>
                        <td className="py-4 px-6 text-slate-400 max-w-xs truncate">{lead.address}</td>
                        <td className="py-4 px-6"><span className="px-2 py-1 bg-slate-100 rounded-lg text-xs">{lead.niche}</span></td>
                        <td className="py-4 px-6">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-tighter",
                            lead.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Histórico de Mensagens</h2>
                  <p className="text-slate-500">Acompanhe as interações entre seus agentes e leads.</p>
                </div>
                <button 
                  onClick={fetchMessages}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <RefreshCw size={20} />
                </button>
              </header>

              <div className="grid grid-cols-1 gap-4">
                {messages.length === 0 ? (
                  <Card className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                      <MessagesSquare size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Nenhuma mensagem ainda</h3>
                    <p className="text-slate-500 max-w-xs mt-2">As interações aparecerão aqui assim que você iniciar seus disparos ou campanhas.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <Card key={msg.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                              msg.sender === 'ai' ? "bg-emerald-50 text-emerald-600" : 
                              msg.sender === 'human' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                            )}>
                              {msg.sender === 'ai' ? 'AI' : msg.sender === 'human' ? 'H' : 'L'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm">{msg.lead_name}</h4>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {msg.sender === 'ai' ? 'Agente IA' : msg.sender === 'human' ? 'Atendente' : 'Lead'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-[10px] text-slate-400 mt-2">
                                {new Date(msg.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div
              key="agenda"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header>
                <h2 className="text-3xl font-bold">Agenda</h2>
                <p className="text-slate-500">Crie e gerencie agendas vinculadas a agentes e membros do time.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="p-6 h-fit lg:col-span-1">
                  <h3 className="text-lg font-bold mb-4">Nova Agenda</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome da Agenda</label>
                      <input
                        type="text"
                        placeholder="Ex: Agenda de Vendas"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newSchedule.name}
                        onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Vincular Agente IA</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newSchedule.agent_id}
                        onChange={(e) => setNewSchedule({ ...newSchedule, agent_id: Number(e.target.value) })}
                      >
                        <option value={0}>Nenhum Agente</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Vincular Membro do Time</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newSchedule.member_id}
                        onChange={(e) => setNewSchedule({ ...newSchedule, member_id: Number(e.target.value) })}
                      >
                        <option value={0}>Nenhum Membro</option>
                        {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Descrição</label>
                      <textarea
                        rows={2}
                        placeholder="Opcional..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none resize-none"
                        value={newSchedule.description}
                        onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                      />
                    </div>
                    <button
                      onClick={createSchedule}
                      className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Criar Agenda
                    </button>
                  </div>
                </Card>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} className="p-6 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <Calendar size={24} />
                        </div>
                        <button 
                          onClick={() => schedule.id && deleteSchedule(schedule.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h4 className="text-xl font-bold mb-2">{schedule.name}</h4>
                      {schedule.description && (
                        <p className="text-sm text-slate-500 mb-4 italic">"{schedule.description}"</p>
                      )}
                      <div className="space-y-3 mt-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <Bot size={14} />
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            Agente: <span className="font-bold text-emerald-600">{schedule.agent_name || 'Não vinculado'}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <Users size={14} />
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            Equipe: <span className="font-bold text-blue-600">{schedule.member_name || 'Não vinculado'}</span>
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {schedules.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                      Nenhuma agenda criada ainda.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'agents' && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header>
                <h2 className="text-3xl font-bold">Agentes de IA</h2>
                <p className="text-slate-500">Crie personalidades para seus disparos e atendimentos.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="p-6 h-fit lg:col-span-1">
                  <h3 className="text-lg font-bold mb-4">Configurar Agente</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome do Agente</label>
                      <input
                        type="text"
                        placeholder="Ex: Vendedor de Software"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Personalidade</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newAgent.personality}
                        onChange={(e) => setNewAgent({ ...newAgent, personality: e.target.value })}
                      >
                        <option value="Amigável e Descontraído">Amigável e Descontraído</option>
                        <option value="Profissional e Direto">Profissional e Direto</option>
                        <option value="Persuasivo e Enérgico">Persuasivo e Enérgico</option>
                        <option value="Empático e Atencioso">Empático e Atencioso</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Instrução de Sistema</label>
                      <textarea
                        rows={3}
                        placeholder="Instruções base para o comportamento..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                        value={newAgent.system_instruction}
                        onChange={(e) => setNewAgent({ ...newAgent, system_instruction: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">FAQ (Respostas Padrão)</label>
                      <div className="space-y-2">
                        {newAgent.faq.map((f, i) => (
                          <div key={i} className="flex gap-2">
                            <input 
                              placeholder="Pergunta" 
                              className="flex-1 text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg"
                              value={f.q}
                              onChange={(e) => {
                                const n = [...newAgent.faq];
                                n[i].q = e.target.value;
                                setNewAgent({ ...newAgent, faq: n });
                              }}
                            />
                            <input 
                              placeholder="Resposta" 
                              className="flex-1 text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg"
                              value={f.a}
                              onChange={(e) => {
                                const n = [...newAgent.faq];
                                n[i].a = e.target.value;
                                setNewAgent({ ...newAgent, faq: n });
                              }}
                            />
                          </div>
                        ))}
                        <button 
                          onClick={() => setNewAgent({ ...newAgent, faq: [...newAgent.faq, { q: '', a: '' }] })}
                          className="text-[10px] text-emerald-600 font-bold hover:underline"
                        >
                          + Adicionar FAQ
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Gatilho de Transbordo (Humano)</label>
                      <input
                        type="text"
                        placeholder="Palavra-chave para chamar humano"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newAgent.handoff_trigger}
                        onChange={(e) => setNewAgent({ ...newAgent, handoff_trigger: e.target.value })}
                      />
                    </div>

                    <button
                      onClick={createAgent}
                      className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Salvar Agente
                    </button>
                  </div>
                </Card>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agents.map((agent) => (
                    <Card key={agent.id} className="p-6 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <Bot size={24} />
                        </div>
                        <button 
                          onClick={() => agent.id && deleteAgent(agent.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h4 className="text-xl font-bold mb-1">{agent.name}</h4>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">{agent.personality}</p>
                      <p className="text-sm text-slate-500 line-clamp-3 flex-1 italic mb-4">
                        "{agent.system_instruction}"
                      </p>
                      <div className="space-y-1 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Gatilho Humano:</p>
                        <p className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">{agent.handoff_trigger}</p>
                      </div>
                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-400">ID: #{agent.id}</span>
                        <button className="text-emerald-600 text-sm font-bold hover:underline">Configurar</button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'kanban' && (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header>
                <h2 className="text-3xl font-bold">Quadro Kanban</h2>
                <p className="text-slate-500">Gerencie o progresso dos seus leads visualmente.</p>
              </header>

              <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px]">
                {['new', 'contacted', 'negotiating', 'closed', 'lost'].map((status) => (
                  <div key={status} className="flex-1 min-w-[280px] space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        {status === 'new' ? 'Novo' : 
                         status === 'contacted' ? 'Contatado' : 
                         status === 'negotiating' ? 'Negociando' : 
                         status === 'closed' ? 'Fechado' : 'Perdido'}
                      </h3>
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {leads.filter(l => l.kanban_status === status).length}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {leads.filter(l => l.kanban_status === status).map((lead) => (
                        <Card key={lead.id} className="p-4 cursor-pointer hover:border-emerald-500 transition-all group">
                          <h4 className="font-bold text-sm">{lead.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-1">{lead.address}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-500">{lead.phone}</span>
                            <select 
                              className="text-[10px] bg-slate-50 border border-slate-100 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              value={lead.kanban_status}
                              onChange={(e) => lead.id && updateKanban(lead.id, e.target.value)}
                            >
                              <option value="new">Novo</option>
                              <option value="contacted">Contatado</option>
                              <option value="negotiating">Negociando</option>
                              <option value="closed">Fechado</option>
                              <option value="lost">Perdido</option>
                            </select>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Configurações</h2>
                  <p className="text-slate-500">Gerencie seu time e credenciais de IA.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setSettingsSubTab('credentials')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      settingsSubTab === 'credentials' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    LLM & APIs
                  </button>
                  <button 
                    onClick={() => setSettingsSubTab('team')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      settingsSubTab === 'team' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Membros do Time
                  </button>
                </div>
              </header>

              {settingsSubTab === 'credentials' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="p-6 h-fit lg:col-span-1">
                    <h3 className="text-lg font-bold mb-4">Nova Credencial</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Provedor</label>
                        <select 
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newCred.provider}
                          onChange={(e) => setNewCred({ ...newCred, provider: e.target.value })}
                        >
                          <option value="openai">OpenAI</option>
                          <option value="groq">Groq</option>
                          <option value="gemini">Google Gemini</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome Amigável</label>
                        <input
                          type="text"
                          placeholder="Ex: Minha Chave Principal"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newCred.name}
                          onChange={(e) => setNewCred({ ...newCred, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">API Key</label>
                        <input
                          type="password"
                          placeholder="sk-..."
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newCred.api_key}
                          onChange={(e) => setNewCred({ ...newCred, api_key: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Modelo Padrão (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: gpt-4o, llama-3-70b"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newCred.model_name}
                          onChange={(e) => setNewCred({ ...newCred, model_name: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={createCredential}
                        className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={20} />
                        Salvar Credencial
                      </button>
                    </div>
                  </Card>

                  <div className="lg:col-span-2 space-y-4">
                    {['openai', 'groq', 'gemini'].map(provider => (
                      <div key={provider} className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{provider}</h4>
                        {credentials.filter(c => c.provider === provider).map((cred) => (
                          <Card key={cred.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                                cred.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                              )}>
                                {cred.provider.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm">{cred.name}</h5>
                                <p className="text-[10px] text-slate-400">{cred.model_name || 'Modelo não definido'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!cred.is_active && (
                                <button 
                                  onClick={() => cred.id && activateCredential(cred.id, cred.provider)}
                                  className="text-xs font-bold text-emerald-600 hover:underline"
                                >
                                  Ativar
                                </button>
                              )}
                              {cred.is_active && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">ATIVO</span>
                              )}
                              <button 
                                onClick={() => cred.id && deleteCredential(cred.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </Card>
                        ))}
                        {credentials.filter(c => c.provider === provider).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic px-2">Nenhuma credencial configurada para {provider}.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="p-6 h-fit lg:col-span-1">
                    <h3 className="text-lg font-bold mb-4">Novo Membro</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome</label>
                        <input
                          type="text"
                          placeholder="Nome completo"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newMember.name}
                          onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Cargo</label>
                        <input
                          type="text"
                          placeholder="Ex: Vendedor, Gestor"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newMember.role}
                          onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">E-mail</label>
                        <input
                          type="email"
                          placeholder="email@exemplo.com"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          value={newMember.email}
                          onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={createMember}
                        className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={20} />
                        Adicionar ao Time
                      </button>
                    </div>
                  </Card>

                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {team.map((member) => (
                      <Card key={member.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold">{member.name}</h4>
                            <p className="text-xs text-slate-500">{member.role}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{member.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => member.id && deleteMember(member.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'whatsapp' && (
            <motion.div
              key="whatsapp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-8 text-center"
            >
              <header>
                <h2 className="text-3xl font-bold">Conexão WhatsApp</h2>
                <p className="text-slate-500">Escaneie o QR Code para conectar seu sistema ao WhatsApp.</p>
              </header>

              <Card className="p-10 flex flex-col items-center justify-center gap-8">
                {wsStatus.status === 'open' ? (
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={48} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">WhatsApp Conectado!</h3>
                      <p className="text-slate-500 mt-2">Seu sistema está pronto para realizar disparos.</p>
                    </div>
                    <button
                      onClick={() => fetch('/api/whatsapp/logout', { method: 'POST' })}
                      className="px-8 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all"
                    >
                      Desconectar Conta
                    </button>
                  </div>
                ) : wsStatus.qr ? (
                  <div className="space-y-8">
                    <div className="p-4 bg-white border-4 border-slate-100 rounded-3xl shadow-xl inline-block">
                      <img src={wsStatus.qr} alt="QR Code" className="w-64 h-64" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Escaneie o QR Code</h3>
                      <p className="text-slate-500 max-w-xs mx-auto">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie este código.</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 py-2 px-4 rounded-full text-sm font-medium">
                      <RefreshCw size={16} className="animate-spin" />
                      Aguardando conexão...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 py-10">
                    <RefreshCw className="animate-spin text-emerald-500 mx-auto" size={48} />
                    <p className="text-slate-500">Iniciando servidor de conexão...</p>
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="p-4 bg-white rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-sm mb-1">Passo 1</h5>
                  <p className="text-xs text-slate-500">Abra o WhatsApp no seu smartphone.</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-sm mb-1">Passo 2</h5>
                  <p className="text-xs text-slate-500">Toque em Menu ou Configurações e selecione Aparelhos Conectados.</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-sm mb-1">Passo 3</h5>
                  <p className="text-xs text-slate-500">Aponte seu celular para esta tela para capturar o código.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
