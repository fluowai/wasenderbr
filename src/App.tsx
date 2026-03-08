import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from "socket.io-client";
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
  Calendar,
  LogOut,
  Building2,
  Lock,
  Mail,
  User,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Image as ImageIcon
} from 'lucide-react';
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

interface Instance {
  id: number;
  name: string;
  engine?: 'baileys' | 'whatsmeow';
  status: 'none' | 'qr' | 'connecting' | 'open' | 'close' | 'reconnecting';
  qr?: string;
  phoneConnected?: string;
}

interface Conversation {
  id: number;
  instance_id: number;
  title: string;
  type: 'contact' | 'group';
  contact_phone?: string;
  group_jid?: string;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  conversation_id?: number;
  lead_id?: number;
  lead_name?: string;
  direction?: 'inbound' | 'outbound';
  chat_type?: 'contact' | 'group';
  author_phone?: string;
  author_push_name?: string;
  sender?: 'ai' | 'human' | 'lead';
  content?: string;
  content_type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  content_text?: string;
  message_id?: string;
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  from_me?: boolean;
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
  status: 'connecting' | 'open' | 'close' | 'qr' | 'none';
  qr: string | null;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, href }: { icon: any, label: string, active: boolean, onClick?: () => void, href?: string }) => (
  <a
    href={href || "#"}
    onClick={(e) => {
      if (onClick) {
        e.preventDefault();
        onClick();
      }
    }}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer no-underline",
      active 
        ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    )}
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
  </a>
);

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

// --- Main App ---

// --- Super Admin Component ---
const SuperAdmin = ({ apiFetch }: { apiFetch: any }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'plans'>('accounts');
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: 0,
    max_agents: 1,
    max_campaigns: 1,
    max_leads: 100,
    features: ''
  });

  const fetchData = async () => {
    const accs = await apiFetch('/api/admin/accounts');
    const pls = await apiFetch('/api/admin/plans');
    if (accs) setAccounts(accs);
    if (pls) setPlans(pls);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createPlan = async () => {
    if (!newPlan.name) return;
    await apiFetch('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify({
        ...newPlan,
        features_json: newPlan.features.split(',').map(f => f.trim())
      })
    });
    setNewPlan({ name: '', price: 0, max_agents: 1, max_campaigns: 1, max_leads: 100, features: '' });
    fetchData();
  };

  const updateAccountPlan = async (accountId: number, planId: number) => {
    await apiFetch(`/api/admin/accounts/${accountId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_id: planId })
    });
    fetchData();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Super Admin</h2>
          <p className="text-slate-500">Gestão global de planos e inquilinos.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveSubTab('accounts')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeSubTab === 'accounts' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Contas (Inquilinos)
          </button>
          <button 
            onClick={() => setActiveSubTab('plans')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeSubTab === 'plans' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Planos
          </button>
        </div>
      </header>

      {activeSubTab === 'accounts' ? (
        <Card>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Empresa</th>
                <th className="py-4 px-6">Plano Atual</th>
                <th className="py-4 px-6">Usuários</th>
                <th className="py-4 px-6">Criado em</th>
                <th className="py-4 px-6">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {accounts.map((acc) => (
                <tr key={acc.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-4 px-6 font-bold">{acc.name}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                      {acc.plan_name || 'Sem Plano'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500">{acc.user_count}</td>
                  <td className="py-4 px-6 text-slate-400">{new Date(acc.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-6">
                    <select 
                      className="text-xs bg-slate-50 border border-slate-200 rounded p-1"
                      value={acc.plan_id || ''}
                      onChange={(e) => updateAccountPlan(acc.id, Number(e.target.value))}
                    >
                      <option value="">Alterar Plano...</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="p-6 h-fit">
            <h3 className="text-lg font-bold mb-4">Novo Plano</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome do Plano</label>
                <input
                  type="text"
                  placeholder="Ex: Pro, Enterprise"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Preço (R$)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Agentes</label>
                  <input
                    type="number"
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                    value={newPlan.max_agents}
                    onChange={(e) => setNewPlan({ ...newPlan, max_agents: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Campanhas</label>
                  <input
                    type="number"
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                    value={newPlan.max_campaigns}
                    onChange={(e) => setNewPlan({ ...newPlan, max_campaigns: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Leads</label>
                  <input
                    type="number"
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                    value={newPlan.max_leads}
                    onChange={(e) => setNewPlan({ ...newPlan, max_leads: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Recursos (separados por vírgula)</label>
                <textarea
                  rows={3}
                  placeholder="Suporte 24h, API, Handoff..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none resize-none"
                  value={newPlan.features}
                  onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                />
              </div>
              <button
                onClick={createPlan}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Criar Plano
              </button>
            </div>
          </Card>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="p-6 border-t-4 border-t-emerald-500">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-bold">{plan.name}</h4>
                  <span className="text-2xl font-black text-emerald-600">R$ {plan.price}</span>
                </div>
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-slate-500 flex justify-between">
                    <span>Agentes IA:</span> <span className="font-bold text-slate-700">{plan.max_agents}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex justify-between">
                    <span>Campanhas:</span> <span className="font-bold text-slate-700">{plan.max_campaigns}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex justify-between">
                    <span>Leads:</span> <span className="font-bold text-slate-700">{plan.max_leads}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(plan.features_json || '[]').map((f: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [auth, setAuth] = useState<{ accountId: number, user: any } | null>(() => {
    const saved = localStorage.getItem('wasender_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ companyName: '', name: '', email: '', password: '' });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'search' | 'leads' | 'agents' | 'whatsapp' | 'campaigns' | 'settings' | 'kanban' | 'messages' | 'agenda' | 'super_admin'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'credentials' | 'team'>('credentials');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [credentials, setCredentials] = useState<LLMCredential[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  
  // WhatsApp & Real-time States
  const [instances, setInstances] = useState<Instance[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [wsStatus, setWsStatus] = useState<WhatsAppStatus>({ status: 'none', qr: null });
  const [msgFilter, setMsgFilter] = useState<'all' | 'contact' | 'group'>('all');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // formatDate helper

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      let normalized = dateStr;
      if (normalized.includes(' ') && !normalized.includes('T')) {
        normalized = normalized.replace(' ', 'T') + 'Z';
      } else if (normalized.includes('T') && !normalized.includes('Z') && !normalized.includes('+')) {
        normalized = normalized + 'Z';
      }
      const date = new Date(normalized);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || '';

  const apiFetch = async (url: string, options: any = {}) => {
    if (!auth) return null;
    const headers = {
      ...options.headers,
      'x-account-id': auth.accountId.toString(),
      'Content-Type': 'application/json'
    };
    // Ensure absolute URL if API_URL is provided, otherwise relative
    const finalUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const res = await fetch(finalUrl, { ...options, headers });
    if (res.status === 401) {
      handleLogout();
      return null;
    }
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    }
    
    // Non-JSON response (likely an error page)
    const text = await res.text();
    console.error(`API Error (${res.status}): Non-JSON response from ${url}`, text.substring(0, 100));
    return null;
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authForm.email, password: authForm.password })
    });
    const data = await res.json();
    if (data.success) {
      const authData = { accountId: data.accountId, user: data.user };
      setAuth(authData);
      localStorage.setItem('wasender_auth', JSON.stringify(authData));
    } else {
      alert(data.error || 'Erro ao entrar');
    }
  };

  const handleRegister = async () => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    });
    const data = await res.json();
    if (data.success) {
      setAuthMode('login');
      alert('Conta criada com sucesso! Faça login.');
    } else {
      alert(data.error || 'Erro ao criar conta');
    }
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('wasender_auth');
  };

  const fetchLeads = async () => {
    const data = await apiFetch('/api/leads');
    if (data) setLeads(data);
  };

  const fetchAgents = async () => {
    const data = await apiFetch('/api/agents');
    if (data) setAgents(data);
  };

  const fetchCampaigns = async () => {
    const data = await apiFetch('/api/campaigns');
    if (data) setCampaigns(data);
  };

  const fetchTeam = async () => {
    const data = await apiFetch('/api/team');
    if (data) setTeam(data);
  };

  const fetchCredentials = async () => {
    const data = await apiFetch('/api/credentials');
    if (data) setCredentials(data);
  };

  const fetchMessages = async () => {
    const data = await apiFetch('/api/messages');
    if (data) setMessages(data);
  };

  const fetchSchedules = async () => {
    const data = await apiFetch('/api/schedules');
    if (data) setSchedules(data);
  };

  const fetchInstances = async () => {
    const data = await apiFetch('/api/whatsapp/instances');
    if (data) setInstances(data);
  };

  const fetchConversations = async () => {
    const data = await apiFetch('/api/conversations');
    if (data) setConversations(data);
  };

  const fetchChatMessages = async (convId: number) => {
    const data = await apiFetch(`/api/conversations/${convId}/messages`);
    if (data) setChatMessages(data);
  };

  // --- Routing & Navigation ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as any;
      const validTabs = ['dashboard', 'search', 'leads', 'agents', 'whatsapp', 'campaigns', 'settings', 'kanban', 'messages', 'agenda', 'super_admin'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    if (window.location.hash) {
      handleHashChange();
    } else {
      window.location.hash = activeTab;
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    if (auth) {
      fetchLeads();
      fetchAgents();
      fetchCampaigns();
      fetchTeam();
      fetchCredentials();
      fetchMessages();
      fetchSchedules();
      fetchInstances();
      fetchConversations();

      const newSocket = io(API_URL || window.location.origin, {
        query: { accountId: auth.accountId }
      });

      newSocket.on("instance.status", ({ instanceId, status, phoneConnected }) => {
        setInstances(prev => prev.map(inst => 
          inst.id === instanceId ? { ...inst, status, phoneConnected, qr: status === 'open' ? null : inst.qr } : inst
        ));
        
        // Update global wsStatus for sidebar/dashboard compatibility
        if (status === 'open') {
          setWsStatus({ status: 'open', qr: null });
        }
      });

      newSocket.on("instance.qr", ({ instanceId, qr }) => {
        setInstances(prev => prev.map(inst => 
          inst.id === instanceId ? { ...inst, qr, status: 'qr' } : inst
        ));
        setWsStatus({ status: 'qr', qr });
      });

      newSocket.on("message.new", (data: any) => {
        console.log('[FRONT_INBOUND_RENDER]', data);
        const { conversationId, message, conversation } = data;
        
        // If the new message belongs to the active conversation, push it directly
        if (conversationId && message) {
          setChatMessages(prev => {
            // Deduplicate by message_id
            if (message.message_id && prev.some((m: any) => m.message_id === message.message_id)) {
              return prev;
            }
            return [...prev, message];
          });
        }
        
        // Update conversations list
        if (conversation) {
          setConversations(prev => {
            const exists = prev.find(c => c.id === conversationId);
            if (exists) {
              return prev.map(c => c.id === conversationId 
                ? { ...c, last_message_preview: conversation.last_message_preview, last_message_at: new Date().toISOString() }
                : c
              ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
            } else {
              // New conversation
              return [{ id: conversationId, ...conversation, last_message_at: new Date().toISOString(), unread_count: 1 } as any, ...prev];
            }
          });
        } else {
          // Fallback: refetch
          fetchConversations();
        }
      });

      newSocket.on("message.status", (data: any) => {
        console.log('[FRONT_OUTBOUND_RENDER] status update:', data);
        const { messageId, status } = data;
        setChatMessages(prev => prev.map((m: any) => 
          m.message_id === messageId ? { ...m, delivery_status: status } : m
        ));
      });

      setSocket(newSocket);
      return () => {
        newSocket.close();
      };
    }
  }, [auth]);

  useEffect(() => {
    if (activeConversationId) {
      fetchChatMessages(activeConversationId);
    }
  }, [activeConversationId]);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await apiFetch('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          prompt: `Encontre 10 empresas do nicho "${searchQuery}" com nome, telefone e endereço. Retorne APENAS um array JSON de objetos com as chaves: name, phone, address.`,
          config: {
            tools: [{ googleMaps: {} }],
          }
        })
      });

      if (response && response.text) {
        const text = response.text;
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setSearchResults(data);
        }
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
      await apiFetch('/api/leads', {
        method: 'POST',
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
    await apiFetch('/api/agents', {
      method: 'POST',
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

  const createInstance = async (name: string, engine: 'baileys' | 'whatsmeow' = 'baileys') => {
    await apiFetch('/api/whatsapp/instances', {
      method: 'POST',
      body: JSON.stringify({ name, engine })
    });
    fetchInstances();
  };

  const connectInstance = async (id: number) => {
    await apiFetch(`/api/whatsapp/instances/${id}/connect`, { method: 'POST' });
    setInstances(prev => prev.map(inst => inst.id === id ? { ...inst, status: 'connecting' } : inst));
  };

  const logoutInstance = async (id: number) => {
    await apiFetch(`/api/whatsapp/instances/${id}/logout`, { method: 'POST' });
    fetchInstances();
  };

  const deleteInstance = async (id: number) => {
    await apiFetch(`/api/whatsapp/instances/${id}`, { method: 'DELETE' });
    fetchInstances();
  };

  const sendMessage = async () => {
    if (!activeConversationId || !newMessage.trim()) return;
    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) {
      console.warn("[SEND] Conversation not found", activeConversationId);
      return;
    }

    // Get instanceId — fallback to first connected instance
    const instanceId = conv.instance_id || instances.find(i => i.status === 'open')?.id;
    if (!instanceId) {
      alert("Erro: Nenhuma instância conectada.");
      return;
    }

    // Build the target JID
    let targetJid = conv.group_jid || conv.contact_phone || '';
    if (targetJid && !targetJid.includes('@')) {
      // Check if it looks like a phone number (starts with digits, 10-15 chars)
      // or a LID (longer than 15 chars)
      if (targetJid.length > 15) {
        targetJid = `${targetJid}@lid`;
      } else {
        targetJid = `${targetJid}@s.whatsapp.net`;
      }
    }

    console.log("[SEND_DEBUG]", { instanceId, targetJid, convInstanceId: conv.instance_id, contactPhone: conv.contact_phone });

    if (!targetJid) {
      alert("Erro: Destinatário inválido");
      return;
    }

    const msgText = newMessage;
    setNewMessage('');

    // Optimistic render
    const optimisticMsg: any = {
      id: Date.now(),
      message_id: `opt_${Date.now()}`,
      conversation_id: activeConversationId,
      direction: 'outbound',
      content_type: 'text',
      content_text: msgText,
      delivery_status: 'pending',
      from_me: true,
      author_push_name: 'Eu',
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

    try {
      const result = await apiFetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          instanceId,
          jid: targetJid,
          message: msgText,
          conversationId: activeConversationId
        })
      });

      if (result?.providerMessageId) {
        setChatMessages(prev => prev.map(m => 
          m.message_id === optimisticMsg.message_id
            ? { ...m, message_id: result.providerMessageId, delivery_status: 'sent' }
            : m
        ));
      }
    } catch (e: any) {
      console.error("[SEND_ERROR]", e);
      setChatMessages(prev => prev.map(m => 
        m.message_id === optimisticMsg.message_id
          ? { ...m, delivery_status: 'failed' }
          : m
      ));
    }
  };

  const sendMediaMessage = async (url: string, type: 'image' | 'video' | 'audio' | 'document') => {
    if (!activeConversationId) return;
    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) return;
    const instanceId = conv.instance_id || instances.find(i => i.status === 'open')?.id;
    if (!instanceId) return;

    let targetJid = conv.group_jid || conv.contact_phone || '';
    if (targetJid && !targetJid.includes('@')) {
      targetJid = targetJid.length > 15 ? `${targetJid}@lid` : `${targetJid}@s.whatsapp.net`;
    }

    const optimisticMsg: any = {
      id: Date.now(),
      message_id: `opt_media_${Date.now()}`,
      conversation_id: activeConversationId,
      direction: 'outbound',
      content_type: type,
      content_text: url,
      delivery_status: 'pending',
      from_me: true,
      author_push_name: 'Eu',
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

    try {
      const result = await apiFetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          instanceId,
          jid: targetJid,
          message: '',
          conversationId: activeConversationId,
          mediaUrl: url,
          contentType: type
        })
      });
      if (result?.providerMessageId) {
        setChatMessages(prev => prev.map(m => m.message_id === optimisticMsg.message_id ? { ...m, delivery_status: 'sent', message_id: result.providerMessageId } : m));
      }
    } catch (e) {
      setChatMessages(prev => prev.map(m => m.message_id === optimisticMsg.message_id ? { ...m, delivery_status: 'failed' } : m));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'x-account-id': auth?.accountId?.toString() || '' },
        body: formData
      });
      const data = await response.json();
      if (data.url) {
        const type = file.type.startsWith('image/') ? 'image' :
                     file.type.startsWith('video/') ? 'video' :
                     file.type.startsWith('audio/') ? 'audio' : 'document';
        sendMediaMessage(data.url, type);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Falha ao enviar arquivo');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteConversation = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta conversa? Todas as mensagens serão perdidas.")) return;
    await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (activeConversationId === id) setActiveConversationId(null);
    fetchConversations();
  };

  const deleteChatMessage = async (id: number) => {
    if (!confirm("Excluir esta mensagem?")) return;
    await apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
    if (activeConversationId) fetchChatMessages(activeConversationId);
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.agent_id) return;
    await apiFetch('/api/campaigns', {
      method: 'POST',
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
    await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  };

  const createMember = async () => {
    if (!newMember.name) return;
    await apiFetch('/api/team', {
      method: 'POST',
      body: JSON.stringify(newMember)
    });
    setNewMember({ name: '', role: '', email: '' });
    fetchTeam();
  };

  const deleteMember = async (id: number) => {
    await apiFetch(`/api/team/${id}`, { method: 'DELETE' });
    fetchTeam();
  };

  const createCredential = async () => {
    if (!newCred.name || !newCred.api_key) return;
    await apiFetch('/api/credentials', {
      method: 'POST',
      body: JSON.stringify(newCred)
    });
    setNewCred({ provider: 'openai', name: '', api_key: '', model_name: '' });
    fetchCredentials();
  };

  const activateCredential = async (id: number, provider: string) => {
    await apiFetch(`/api/credentials/${id}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ provider })
    });
    fetchCredentials();
  };

  const deleteCredential = async (id: number) => {
    await apiFetch(`/api/credentials/${id}`, { method: 'DELETE' });
    fetchCredentials();
  };

  const createSchedule = async () => {
    if (!newSchedule.name) return;
    await apiFetch('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(newSchedule)
    });
    setNewSchedule({ name: '', agent_id: 0, member_id: 0, description: '' });
    fetchSchedules();
  };

  const deleteSchedule = async (id: number) => {
    await apiFetch(`/api/schedules/${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  const updateKanban = async (id: number, status: string) => {
    await apiFetch(`/api/leads/${id}/kanban`, {
      method: 'PATCH',
      body: JSON.stringify({ kanban_status: status })
    });
    fetchLeads();
  };

  const deleteAgent = async (id: number) => {
    await apiFetch(`/api/agents/${id}`, { method: 'DELETE' });
    fetchAgents();
  };

  const sendBroadcast = async (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    // Use the first connected instance
    const activeInstance = instances.find(inst => inst.status === 'open');
    if (!activeInstance) {
      alert("Nenhuma instância conectada para realizar o disparo.");
      return;
    }

    setLoading(true);
    for (const lead of leads) {
      if (lead.status === 'pending' && lead.phone) {
        try {
          const aiResponse = await apiFetch('/api/ai/generate', {
            method: 'POST',
            body: JSON.stringify({
              model: "gemini-2.0-flash",
              prompt: `Você é um assistente comercial com a seguinte instrução: "${agent.system_instruction}". Escreva uma mensagem curta e persuasiva para o cliente "${lead.name}" da empresa "${lead.address}". Não use placeholders, escreva a mensagem final.`
            })
          });

          if (aiResponse && aiResponse.text) {
            const message = aiResponse.text;
            const cleanPhone = lead.phone.replace(/\D/g, '');
            const jid = `${cleanPhone}@s.whatsapp.net`;

            await apiFetch('/api/whatsapp/send', {
              method: 'POST',
              body: JSON.stringify({ 
                instanceId: activeInstance.id,
                jid, 
                message 
              })
            });

            await apiFetch('/api/messages/save', {
              method: 'POST',
              body: JSON.stringify({ lead_id: lead.id, sender: 'ai', content: message })
            });
          }
        } catch (e) {
          console.error("Broadcast error for lead", lead.name, e);
        }
      }
    }
    setLoading(false);
    fetchMessages();
    alert("Disparo concluído!");
  };

  // Replaced with logoutInstance
  const logoutWhatsApp = async () => {
    const activeInstance = instances.find(inst => inst.status === 'open');
    if (activeInstance) {
      await logoutInstance(activeInstance.id);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <Send size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Wasenderbr SaaS</h1>
            <p className="text-slate-500">Acesse sua plataforma de automação</p>
          </div>

          <div className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome da Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Sua Empresa Ltda"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={authForm.companyName}
                    onChange={e => setAuthForm({ ...authForm, companyName: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Seu Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="João Silva"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={authForm.name}
                  onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </div>
            </div>

            <button
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>

            <div className="text-center pt-4">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-sm text-emerald-600 font-medium hover:underline"
              >
                {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} href="#dashboard" />
          <SidebarItem icon={MessagesSquare} label="Mensagens" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} href="#messages" />
          <SidebarItem icon={Bot} label="Agentes IA" active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} href="#agents" />
          <SidebarItem icon={LayoutDashboard} label="Kanban" active={activeTab === 'kanban'} onClick={() => setActiveTab('kanban')} href="#kanban" />
          <SidebarItem icon={Calendar} label="Agenda" active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} href="#agenda" />
          <SidebarItem icon={Search} label="Captar Leads" active={activeTab === 'search'} onClick={() => setActiveTab('search')} href="#search" />
          <SidebarItem icon={Users} label="Meus Leads" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} href="#leads" />
          <SidebarItem icon={MessageSquare} label="Campanhas" active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')} href="#campaigns" />
          <SidebarItem icon={QrCode} label="Conexão WhatsApp" active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')} href="#whatsapp" />
          <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} href="#settings" />
          {auth.user.role === 'super_admin' && (
            <SidebarItem icon={Lock} label="Super Admin" active={activeTab === 'super_admin'} onClick={() => setActiveTab('super_admin')} href="#super_admin" />
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
          <div className={cn(
            "p-4 rounded-2xl flex items-center gap-3",
            wsStatus.status === 'open' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}>
            <div className={cn("w-2 h-2 rounded-full", wsStatus.status === 'open' ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {wsStatus.status === 'open' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
            </span>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-xs">
              {auth.user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{auth.user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{auth.user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair</span>
          </button>
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
              className="h-[calc(100vh-160px)] flex border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-sm"
            >
              {/* Conversations Sidebar */}
              <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button 
                      onClick={() => setMsgFilter('all')}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all", 
                        msgFilter === 'all' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >TODOS</button>
                    <button 
                      onClick={() => setMsgFilter('contact')}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all", 
                        msgFilter === 'contact' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >CONTATOS</button>
                    <button 
                      onClick={() => setMsgFilter('group')}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all", 
                        msgFilter === 'group' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >GRUPOS</button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar conversas..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations
                    .filter(c => msgFilter === 'all' ? true : c.type === msgFilter)
                    .map((conv) => (
                    <div key={conv.id} className="group relative">
                      <button
                        onClick={() => setActiveConversationId(conv.id)}
                        className={cn(
                          "w-full p-4 flex gap-3 text-left transition-all hover:bg-white border-b border-slate-50",
                          activeConversationId === conv.id ? "bg-white border-l-4 border-l-emerald-500" : "bg-transparent"
                        )}
                      >
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold",
                            conv.type === 'group' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            {(conv.title || '').charAt(0)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-50">
                            {conv.type === 'group' ? <Users size={12} /> : <User size={12} />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5 pr-6">
                            <h4 className="font-bold text-[14px] text-slate-900 truncate leading-tight">{conv.title}</h4>
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                              {formatDate(conv.last_message_at)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate leading-relaxed">
                            {conv.last_message || 'Inicie uma conversa'}
                          </p>
                        </div>
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                         className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhuma conversa encontrada.
                    </div>
                  )}
                </div>
              </div>

              {/* Chat View */}
              <div className="flex-1 flex flex-col bg-white">
                {activeConversationId ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold uppercase">
                          {conversations.find(c => c.id === activeConversationId)?.title?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {conversations.find(c => c.id === activeConversationId)?.title}
                          </h3>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Online</p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-slate-400">
                        <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><Smartphone size={20} /></button>
                        <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors"><Search size={20} /></button>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
                      {chatMessages.map((msg) => (
                        <div 
                          key={msg.id || msg.message_id} 
                          className={cn(
                            "flex flex-col max-w-[70%] group",
                            msg.direction === 'outbound' ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {msg.chat_type === 'group' && msg.direction === 'inbound' && (
                              <span className="text-[10px] text-slate-400 ml-1">{msg.author_push_name || msg.author_phone}</span>
                            )}
                            <button 
                              onClick={() => deleteChatMessage(msg.id)}
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className={cn(
                            "px-5 py-3 rounded-2xl text-[15px] shadow-sm leading-relaxed tracking-tight font-medium overflow-hidden",
                            msg.direction === 'outbound' 
                              ? msg.delivery_status === 'failed' 
                                ? "bg-rose-500 text-white rounded-tr-none"
                                : "bg-emerald-500 text-white rounded-tr-none"
                              : "bg-white text-slate-900 border border-slate-100 rounded-tl-none"
                          )}>
                             {msg.content_type === 'image' ? (
                               <img src={msg.content_text} alt="Imagem" className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.content_text, '_blank')} />
                             ) : msg.content_type === 'audio' ? (
                               <audio src={msg.content_text} controls className="max-w-[240px] h-10" />
                             ) : msg.content_type === 'video' ? (
                               <video src={msg.content_text} controls className="max-w-full rounded-lg" />
                             ) : msg.content_type === 'document' ? (
                               <a href={msg.content_text} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline decoration-emerald-200">
                                 <Paperclip size={16} /> Ver Documento
                               </a>
                             ) : (
                               msg.content_text || msg.content
                             )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-slate-400">
                              {formatDate(msg.created_at)}
                            </span>
                            {msg.direction === 'outbound' && (
                              <span className="text-[10px]">
                                {msg.delivery_status === 'pending' && <span className="text-amber-400" title="Enviando...">⏳</span>}
                                {msg.delivery_status === 'sent' && <span className="text-slate-400" title="Enviada">✓</span>}
                                {msg.delivery_status === 'delivered' && <span className="text-slate-400" title="Entregue">✓✓</span>}
                                {msg.delivery_status === 'read' && <span className="text-blue-500" title="Lida">✓✓</span>}
                                {msg.delivery_status === 'failed' && (
                                  <span className="text-rose-500 cursor-pointer" title="Falhou - clique para reenviar">❌</span>
                                )}
                                {!msg.delivery_status && <span className="text-slate-400">✓</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2">
                           <MessageSquare size={32} />
                           <p className="text-sm">Envie uma mensagem para começar.</p>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-slate-100">
                      <div className="flex gap-4">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileChange}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 text-slate-400 hover:text-emerald-500 transition-colors"
                        >
                          <Paperclip size={20} />
                        </button>
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all text-sm"
                            placeholder="Digite sua mensagem..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                          />
                        </div>
                        <button 
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                      <MessagesSquare size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Selecione uma conversa</h3>
                    <p className="text-slate-500 max-w-xs mt-2 mx-auto">
                      Suas mensagens recebidas e enviadas aparecerão aqui em tempo real.
                    </p>
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

          {activeTab === 'campaigns' && (
            <motion.div
              key="campaigns"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header>
                <h2 className="text-3xl font-bold">Campanhas</h2>
                <p className="text-slate-500">Configure automações de disparo e transição.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="p-6 h-fit lg:col-span-1">
                  <h3 className="text-lg font-bold mb-4">Nova Campanha</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome da Campanha</label>
                      <input
                        type="text"
                        placeholder="Ex: Lançamento Verão"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Agente IA Responsável</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newCampaign.agent_id}
                        onChange={(e) => setNewCampaign({ ...newCampaign, agent_id: Number(e.target.value) })}
                      >
                        <option value={0}>Selecione um Agente</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Método Inicial</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        value={newCampaign.initial_method}
                        onChange={(e) => setNewCampaign({ ...newCampaign, initial_method: e.target.value as 'ai' | 'direct' })}
                      >
                        <option value="ai">IA (Assistente responde primeiro)</option>
                        <option value="direct">Direto (Apenas disparo de mensagem)</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Regras de Transição</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Após primeira resposta</label>
                          <select 
                            className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            value={newCampaign.transition_rules.after_first_response}
                            onChange={(e) => setNewCampaign({ 
                              ...newCampaign, 
                              transition_rules: { ...newCampaign.transition_rules, after_first_response: e.target.value } 
                            })}
                          >
                            <option value="continue_ai">Continuar com IA</option>
                            <option value="handoff">Handoff Humano Imediato</option>
                            <option value="pause">Pausar Automação</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Em palavras-chave (Handoff)</label>
                          <input
                            type="text"
                            placeholder="Ex: falar com humano, ajuda, suporte"
                            className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            value={newCampaign.transition_rules.on_keyword}
                            onChange={(e) => setNewCampaign({ 
                              ...newCampaign, 
                              transition_rules: { ...newCampaign.transition_rules, on_keyword: e.target.value } 
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={createCampaign}
                      className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <Plus size={20} />
                      Criar Campanha
                    </button>
                  </div>
                </Card>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="p-6 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <MessageSquare size={24} />
                        </div>
                        <button 
                          onClick={() => campaign.id && deleteCampaign(campaign.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h4 className="text-xl font-bold mb-1">{campaign.name}</h4>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                          campaign.initial_method === 'ai' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {campaign.initial_method === 'ai' ? 'IA Ativa' : 'Disparo Direto'}
                        </span>
                      </div>
                      
                      <div className="space-y-3 mt-auto pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Agente:</span>
                          <span className="font-bold text-slate-700">
                            {agents.find(a => a.id === campaign.agent_id)?.name || 'Desconhecido'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Handoff:</span>
                          <span className="font-bold text-slate-700">
                            {campaign.transition_rules.on_keyword || 'Não configurado'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {campaigns.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                      Nenhuma campanha configurada ainda.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'super_admin' && auth.user.role === 'super_admin' && (
            <SuperAdmin apiFetch={apiFetch} />
          )}

          {activeTab === 'whatsapp' && (
            <motion.div
              key="whatsapp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Conexões WhatsApp</h2>
                  <p className="text-slate-500">Gerencie múltiplas instâncias e conexões.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const name = prompt("Nome da nova instância Woozapi 1.0 (Baileys):");
                      if (name) createInstance(name, 'baileys');
                    }}
                    className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Nova 1.0
                  </button>
                  <button 
                    onClick={() => {
                      const name = prompt("Nome da nova instância Woozapi 2.0 (Whatsmeow):");
                      if (name) createInstance(name, 'whatsmeow');
                    }}
                    className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 animate-pulse-subtle"
                  >
                    <Plus size={20} />
                    Nova 2.0 (Premium)
                  </button>
                </div>
              </header>

              <div className="space-y-12">
                {/* Woozapi 1.0 - Baileys */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-slate-300 rounded-full" />
                    <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Woozapi 1.0 (Baileys)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {instances.filter(i => !i.engine || i.engine === 'baileys').map((inst) => (
                      <Card key={inst.id} className="p-6 flex flex-col border-t-4 border-t-slate-200">
                        <div className="flex items-start justify-between mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            inst.status === 'open' ? "bg-emerald-50 text-emerald-600" :
                            inst.status === 'qr' ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {inst.status === 'open' ? <CheckCircle2 size={24} /> : <Smartphone size={24} />}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => deleteInstance(inst.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1">
                          <h4 className="text-xl font-bold mb-1">{inst.name}</h4>
                          <div className="flex items-center gap-2 mb-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              inst.status === 'open' ? "bg-emerald-100 text-emerald-700" :
                              inst.status === 'qr' ? "bg-amber-100 text-amber-700" :
                              inst.status === 'connecting' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                            )}>
                              {inst.status === 'open' ? 'Conectado' : 
                               inst.status === 'qr' ? 'Aguardando QR' :
                               inst.status === 'connecting' ? 'Conectando...' : 
                               inst.status === 'reconnecting' ? 'Reconectando...' : 'Desconectado'}
                            </span>
                            {inst.phoneConnected && (
                              <span className="text-xs font-mono text-slate-400">+{inst.phoneConnected}</span>
                            )}
                          </div>

                          {inst.status === 'qr' && inst.qr ? (
                            <div className="mt-4 p-4 bg-white border-2 border-slate-100 rounded-2xl flex flex-col items-center gap-4">
                               <img src={inst.qr} alt="QR Code" className="w-48 h-48" />
                               <p className="text-[10px] text-slate-400 text-center px-4">
                                 Escaneie com seu WhatsApp para conectar
                               </p>
                            </div>
                          ) : inst.status === 'open' ? (
                            <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                              <p className="text-xs text-emerald-700 font-medium">Instância pronta para uso.</p>
                            </div>
                          ) : inst.status === 'none' || inst.status === 'close' ? (
                            <button 
                              onClick={() => connectInstance(inst.id)}
                              className="mt-4 w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                            >
                              Gerar QR Code
                            </button>
                          ) : null}
                        </div>

                        {inst.status === 'open' && (
                          <button 
                            onClick={() => logoutInstance(inst.id)}
                            className="mt-6 text-sm font-bold text-red-600 hover:underline"
                          >
                            Desconectar
                          </button>
                        )}
                      </Card>
                    ))}
                    {instances.filter(i => !i.engine || i.engine === 'baileys').length === 0 && (
                      <div className="col-span-full py-10 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-400 text-xs">
                        Nenhuma instância Woozapi 1.0 encontrada.
                      </div>
                    )}
                  </div>
                </section>

                {/* Woozapi 2.0 - Whatsmeow */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full animate-pulse" />
                    <h3 className="text-xl font-bold text-emerald-600 uppercase tracking-widest">Woozapi 2.0 (Whatsmeow)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {instances.filter(i => i.engine === 'whatsmeow').map((inst) => (
                      <Card key={inst.id} className="p-6 flex flex-col border-t-4 border-t-emerald-500 shadow-lg shadow-emerald-50">
                        <div className="flex items-start justify-between mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            inst.status === 'open' ? "bg-emerald-500 text-white" :
                            inst.status === 'qr' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-400"
                          )}>
                            {inst.status === 'open' ? <CheckCircle2 size={24} /> : <Smartphone size={24} />}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => deleteInstance(inst.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1">
                          <h4 className="text-xl font-bold mb-1">{inst.name}</h4>
                          <div className="flex items-center gap-2 mb-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              inst.status === 'open' ? "bg-emerald-500 text-white" :
                              inst.status === 'qr' ? "bg-amber-100 text-amber-700" :
                              inst.status === 'connecting' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            )}>
                              {inst.status === 'open' ? 'Conectado (v2.0)' : 
                               inst.status === 'qr' ? 'Aguardando QR' :
                               inst.status === 'connecting' ? 'Conectando...' : 
                               inst.status === 'reconnecting' ? 'Reconectando...' : 'Desconectado'}
                            </span>
                            {inst.phoneConnected && (
                              <span className="text-xs font-mono text-emerald-600 font-bold">+{inst.phoneConnected}</span>
                            )}
                          </div>

                          {inst.status === 'qr' && inst.qr ? (
                            <div className="mt-4 p-4 bg-white border-2 border-emerald-100 rounded-2xl flex flex-col items-center gap-4">
                               <img src={inst.qr} alt="QR Code" className="w-48 h-48" />
                               <p className="text-[10px] text-emerald-600 font-bold text-center px-4">
                                 Escaneie para conectar com Woozapi 2.0
                               </p>
                            </div>
                          ) : inst.status === 'open' ? (
                            <div className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-200">
                              <p className="text-xs text-emerald-700 font-bold">Instância de alta estabilidade ativa.</p>
                            </div>
                          ) : inst.status === 'none' || inst.status === 'close' ? (
                            <button 
                              onClick={() => connectInstance(inst.id)}
                              className="mt-4 w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
                            >
                              Gerar QR Code 2.0
                            </button>
                          ) : null}
                        </div>

                        {inst.status === 'open' && (
                          <button 
                            onClick={() => logoutInstance(inst.id)}
                            className="mt-6 text-sm font-bold text-red-600 hover:underline"
                          >
                            Desconectar
                          </button>
                        )}
                      </Card>
                    ))}
                    {instances.filter(i => i.engine === 'whatsmeow').length === 0 && (
                      <div className="col-span-full py-10 border-2 border-dashed border-emerald-100 rounded-3xl text-center text-emerald-400 text-xs">
                        Nenhuma instância Woozapi 2.0 (Whatsmeow) encontrada.
                      </div>
                    )}
                  </div>
                </section>

                {instances.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <QrCode size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Nenhuma instância</h3>
                    <p className="text-slate-500 mt-2">Clique em "Nova 1.0" ou "Nova 2.0" para começar.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
