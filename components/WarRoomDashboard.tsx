'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  Layout, 
  Target, 
  Mail, 
  Cpu, 
  ShieldCheck, 
  Eye, 
  Zap,
  ChevronRight,
  Search,
  Plus,
  AlertTriangle,
  TrendingDown,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Network,
  Edit3
} from 'lucide-react';

interface Lead {
  id: string;
  nom: string;
  secteur: string;
  ville: string;
  site_web: string;
  email: string;
  score_audit: number;
  audit_data: any;
  strategy: any;
  archi_data: any;
  proposition_data: any;
  email_objet: string;
  email_body: string;
  status: string;
  business_potential_score?: number;
  estimated_deal_value?: number;
  closer_output?: any;
  proposal_data?: any;
  commercial_status?: {
    budget_validated: boolean;
    authority_confirmed: boolean;
    timing_confirmed: boolean;
  };
  created_at: string;
  screenshot_url?: string;
}

export default function WarRoomDashboard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads || []);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeads?.[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'audit' | 'stratege' | 'architecture' | 'closer' | 'email' | 'orchestrateur'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // 🔴 CAMPAIGN LAUNCHER STATE
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);
  const [campaignData, setCampaignData] = useState({
    secteur: '',
    ville: 'Nice',
    count: 10,
    pipeline: true
  });

  // 🔴 SYNC LEADS STATE WITH PROPS
  React.useEffect(() => {
    setLeads(initialLeads || []);
  }, [initialLeads]);

  // 🔴 ENSURE SELECTED LEAD IS VALID
  React.useEffect(() => {
    if (leads.length > 0 && !leads.find(l => String(l.id) === String(selectedLeadId))) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  // AUTO-HIDE NOTIFICATION
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const selectedLead = leads.find(l => String(l.id) === String(selectedLeadId));

  const filteredLeads = leads.filter(l => 
    l.nom?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
    l.site_web?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedLead || isSending) return;
    setIsSending(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const resp = await fetch('/api/resend/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          subject: selectedLead.email_objet,
          body: selectedLead.email_body
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'sent' } : l));
        setNotification({ type: 'success', message: 'Email envoyé avec succès !' });
      } else {
        setNotification({ type: 'error', message: "Erreur d'envoi." });
      }
    } catch (e) {
      setNotification({ type: 'error', message: "Erreur réseau." });
    } finally {
      setIsSending(false);
    }
  };

  const handleReprocess = async () => {
    if (!selectedLead || isProcessing) return;
    
    console.log(`[Dashboard] 🚀 Force Reprocess requested for: ${selectedLead.nom}`);
    setIsProcessing(true);
    setNotification({ type: 'info', message: 'LANCEMENT DU PROTOCOLE... 🚀 Connection au Cerveau GhostNeural.' });
    
    // 🔴 CLEAR STALE DATA LOCALLY
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { 
      ...l, 
      audit_data: null, 
      qualification: null,
      score_global: 0,
      brain_synthesis: "Analyse en cours (Relancée)..." 
    } : l));

    setActiveTab('orchestrateur');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const resp = await fetch('/api/orchestrator-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_web: selectedLead.site_web,
          nom: selectedLead.nom,
          secteur: selectedLead.secteur,
          ville: selectedLead.ville,
          email: selectedLead.email,
          leadId: selectedLead.id,
          trigger_n8n: true
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (resp.ok) {
        setNotification({ 
          type: 'success', 
          message: 'FLOW N8N DÉMARRÉ ! ✅ Vérifie ton n8n (Execution window). Attends 60s puis actualise.' 
        });
      } else {
        const errorData = await resp.json();
        setNotification({ 
          type: 'error', 
          message: `ÉCHEC TRIGGER ! ${errorData.details || errorData.error || 'Vérifie si n8n est lancé.'}` 
        });
      }
    } catch (e: any) {
      console.error(`[Dashboard] Trigger Error:`, e);
      setNotification({ type: 'error', message: `Erreur réseau : ${e.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignData.secteur || !campaignData.ville || isLaunchingCampaign) return;
    
    setIsLaunchingCampaign(true);
    setNotification({ type: 'info', message: `INITIATION DE LA CHASSE... 🕵️‍♂️ Cibles: ${campaignData.secteur} à ${campaignData.ville}` });
    
    try {
      const resp = await fetch('/api/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });
      
      const data = await resp.json();
      
      if (data.success) {
        setNotification({ 
          type: 'success', 
          message: `CHASSE RÉUSSIE ! 🎯 ${data.count} leads trouvés. ${campaignData.pipeline ? 'Pipeline automatique lancé.' : 'Disponibles dans la liste.'}` 
        });
        setIsCampaignModalOpen(false);
        // On pourrait reset le dashboard ou forcer un refresh si on avait une route d'api pour list_leads
        window.location.reload(); // Simple refresh pour voir les nouveaux leads (car initialLeads vient du serveur)
      } else {
        setNotification({ type: 'error', message: `Erreur Chasseur: ${data.error}` });
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: `Erreur réseau: ${e.message}` });
    } finally {
      setIsLaunchingCampaign(false);
    }
  };
  const handleUpdateCommercialStatus = async (key: string, value: boolean) => {
    if (!selectedLead) return;
    const newStatus = { 
      ...(selectedLead.commercial_status || { budget_validated: false, authority_confirmed: false, timing_confirmed: false }),
      [key]: value 
    };
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, commercial_status: newStatus } : l));
    try {
      await fetch('/api/leads/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, commercial_status: newStatus })
      });
    } catch (e) { console.error("Sync Error:", e); }
  };

  const TabButton = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-[10px] uppercase tracking-[0.2em] ${
        activeTab === id 
          ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className="w-1/4 min-w-[320px] max-w-[400px] border-r border-slate-800/50 bg-[#0f172a]/20 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800/50 bg-[#020617]/50">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-black italic tracking-tighter text-white">
              GHOST<span className="text-blue-500">NEURAL</span>
            </h1>
            <button 
              onClick={() => setIsCampaignModalOpen(true)}
              className="group relative h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:scale-110 active:scale-95 transition-all"
              title="Lancer une nouvelle chasse"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="RECHERCHER UN LEAD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold tracking-widest uppercase focus:outline-none focus:border-blue-500/50 transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`w-full p-6 flex flex-col gap-3 border-b border-slate-800/20 transition-all text-left group relative ${
                selectedLeadId === lead.id 
                  ? 'bg-blue-600/10 border-r-4 border-r-blue-500' 
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-center text-sm font-black text-blue-400 group-hover:scale-110 transition-transform">
                  {lead.nom?.charAt(0) || 'L'}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
                    lead.status === 'sent' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                  }`}>
                    {lead.status?.replace('_', ' ').toUpperCase() || 'PRECISION SCAN'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{lead.score_audit ?? 50}%</span>
                </div>
              </div>
              <div className="mt-1">
                <h3 className="text-sm font-black text-white truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">{lead.nom}</h3>
                <p className="text-[9px] text-slate-500 font-mono truncate opacity-60">{lead.site_web?.replace(/^https?:\/\//, '')}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617]">
        {selectedLead ? (
          <>
            <header className="bg-[#020617]/80 border-b border-slate-800/50 backdrop-blur-xl sticky top-0 z-20">
              <div className="px-10 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-20 w-20 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] border border-white/10">
                    {selectedLead.nom?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{selectedLead.nom}</h2>
                      {selectedLead.audit_data?.qualification?.status === 'HIGH' && (
                        <div className="px-3 py-1 bg-red-600 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500/50">
                          HIGH POTENTIAL
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg text-blue-400 font-black tracking-widest uppercase">{selectedLead.secteur}</span>
                      <span className="text-slate-700 text-lg">/</span>
                      <a href={selectedLead.site_web} target="_blank" className="text-slate-400 text-[10px] font-bold hover:text-blue-400 hover:underline transition-all font-mono tracking-tighter">{selectedLead.site_web}</a>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleReprocess}
                    disabled={isProcessing}
                    className="relative group bg-white text-black px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] overflow-hidden transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                  >
                    <span className="relative z-10">{isProcessing ? 'SCANNING...' : 'Relancer l\'Orchestrateur'}</span>
                    <div className="absolute inset-0 bg-blue-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
                    <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">LANCER LE CHOC</span>
                  </button>
                </div>
              </div>
              <nav className="flex px-6">
                <TabButton id="audit" icon={Eye} label="L'Éclaireur" />
                <TabButton id="stratege" icon={Target} label="Le Stratège" />
                <TabButton id="architecture" icon={Layout} label="Architecte" />
                <TabButton id="closer" icon={ShieldCheck} label="Closer" />
                <TabButton id="email" icon={Mail} label="Copywriter" />
                <TabButton id="orchestrateur" icon={Cpu} label="System Log" />
              </nav>
            </header>

            <div className="flex-1 overflow-y-auto p-12 bg-gradient-to-br from-[#020617] to-[#0f172a]/40 custom-scrollbar">
              <div
                className="max-w-6xl mx-auto pb-20"
              >
                  {(() => {
                    const baseData = selectedLead.audit_data?.audit || selectedLead.audit_data || {};
                    const normalizedAudit = baseData.audit_data || baseData.audit || baseData;
                    const normalizedQualif = (selectedLead as any).qualification?.scores 
                      ? (selectedLead as any).qualification 
                      : (baseData.qualification || baseData.brain_decision_1 || (selectedLead as any).qualification || selectedLead || {});
                    const normalizedStrategy = selectedLead.strategy && Object.keys(selectedLead.strategy).length > 0 
                      ? selectedLead.strategy 
                      : selectedLead.proposition_data?.strategy || selectedLead.proposition_data?.stratege || selectedLead.proposition_data || {};
                    
                    const normalizedArchitecture = selectedLead.archi_data && Object.keys(selectedLead.archi_data).length > 0
                      ? selectedLead.archi_data
                      : selectedLead.proposition_data?.architecture || selectedLead.proposition_data?.architecte || selectedLead.proposition_data || {};
                    const normalizedSEO = normalizedAudit.seo || baseData.seo || {};
                    const normalizedPiliers = normalizedAudit.analyse_piliers || normalizedAudit.piliers || baseData.analyse_piliers || baseData.piliers || {};
                    const normalizedCWV = normalizedAudit.core_web_vitals || normalizedAudit.perf || baseData.core_web_vitals || {};
                    const normalizedImpact = normalizedAudit.estimation_impact || normalizedAudit.pertes_business || baseData.estimation_impact || {};

                    const getSafeScore = (val: any) => {
                      const num = parseFloat(String(val));
                      if (isNaN(num)) return 5;
                      return num > 10 ? (num / 10).toFixed(1) : num.toFixed(1);
                    };

                    const getGlobalScore = () => {
                      return normalizedQualif.score_global || 
                             normalizedQualif.score_audit || 
                             selectedLead.score_audit || 
                             normalizedQualif.confidence || 0;
                    };

                    const getVerdict = () => {
                      return normalizedQualif.raison || 
                             normalizedQualif.brain_reasoning || 
                             normalizedQualif.verdict || 
                             selectedLead.status === 'sent' ? 'PROPOSITION ENVOYÉE' : 'Analyse en cours...';
                    };

                    const renderSafe = (val: any, fallback: string = "Non spécifié", depth: number = 0): any => {
                      if (depth > 2) return <span className="text-slate-500 opacity-50 italic">[Object complexe...]</span>;
                      if (val === undefined || val === null || val === "") return fallback;
                      
                      if (typeof val === 'object' && !Array.isArray(val)) {
                        const entries = Object.entries(val).slice(0, 8); // LIMIT ITEMS
                        return (
                          <div className="space-y-2">
                            {entries.map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span className="text-[10px] uppercase opacity-50 font-bold">{k}:</span>
                                <span className="text-sm font-medium">{renderSafe(v, "", depth + 1)}</span>
                              </div>
                            ))}
                            {Object.entries(val).length > 8 && <div className="text-[10px] text-slate-600">... ({Object.entries(val).length - 8} de plus)</div>}
                          </div>
                        );
                      }
                      return String(val);
                    };

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                          <div className="md:col-span-3 bg-blue-600/5 border border-blue-500/20 p-8 rounded-[3rem] flex items-center justify-between backdrop-blur-md">
                            <div>
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-2 italic">Phase 2 — Qualification Commerciale (BANT)</h4>
                              <p className="text-sm text-slate-400 font-medium italic">Confirmez les pré-requis avant de passer au Closing.</p>
                            </div>
                            <div className="flex gap-6">
                              {[
                                { key: 'budget_validated', label: 'Budget Validé' },
                                { key: 'authority_confirmed', label: 'Autorité Confirmée' },
                                { key: 'timing_confirmed', label: 'Timing Serré' }
                              ].map((item) => (
                                <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    checked={(selectedLead.commercial_status as any)?.[item.key] || false}
                                    onChange={(e) => handleUpdateCommercialStatus(item.key, e.target.checked)}
                                    className="w-5 h-5 bg-black border border-slate-700 rounded-lg checked:bg-blue-600 checked:border-blue-500 transition-all cursor-pointer ring-0 focus:ring-0"
                                  />
                                  <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest italic">{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {activeTab === 'audit' && (
                          <div className="space-y-12">
                            {normalizedQualif && (
                              <div className="p-10 bg-slate-900/60 rounded-[3rem] border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8">
                                   <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                     normalizedQualif.priorite === 'haute' ? 'border-red-500/50 text-red-400 bg-red-500/5' : 'border-blue-500/50 text-blue-400 bg-blue-500/5'
                                   }`}>
                                     Priorité {normalizedQualif.priorite || 'moyenne'}
                                   </span>
                                </div>
                                <h3 className="text-blue-400 text-[12px] font-black uppercase tracking-[0.5em] mb-10 italic flex items-center gap-3">
                                  <Target size={16} /> Qualification du Prospect
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                  <div>
                                    <div className="flex items-center justify-between mb-8">
                                      <span className="text-slate-400 text-[11px] uppercase font-black tracking-widest italic">Score de Sélection Global</span>
                                      <span className={`text-4xl font-black italic tracking-tighter ${
                                        (getGlobalScore() || 0) >= 80 ? "text-emerald-400" : (getGlobalScore() || 0) >= 60 ? "text-amber-400" : "text-red-400"
                                      }`}>
                                        {getGlobalScore() || 0}/100
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                      {Object.entries(normalizedQualif.scores || {}).length > 0 ? (
                                        Object.entries(normalizedQualif.scores || {}).map(([key, value]: any) => (
                                          <div key={key} className="p-5 bg-black/40 rounded-2xl border border-slate-800/50 group/item hover:border-blue-500/30 transition-all">
                                            <div className="flex justify-between items-center mb-3">
                                              <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 italic">{key}</span>
                                              <span className="text-xs font-black text-blue-400 font-mono">{value}/25</span>
                                            </div>
                                            <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                style={{ width: `${(value / 25) * 100}%` }}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full"
                                              ></div>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="col-span-2 p-5 bg-black/40 rounded-2xl border border-dashed border-slate-800/50 text-center opacity-50">
                                          <span className="text-[10px] uppercase font-black italic">Détail des scores non disponible</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col justify-center">
                                    <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[2rem] relative shadow-inner">
                                      <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 italic">Verdict du Stratège</h4>
                                      <p className="text-slate-100 text-lg leading-relaxed italic font-medium">
                                        "{getVerdict()}"
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {normalizedImpact && (
                              <div className="mb-12 bg-red-950/20 border border-red-500/30 rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden group hover:border-red-500/50 transition-all">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <TrendingDown size={120} className="text-red-500" />
                                </div>
                                <h3 className="text-[12px] font-black text-red-400 uppercase tracking-[0.5em] mb-10 italic flex items-center gap-3">
                                  <AlertCircle size={16} /> Impact Business : Le Coût de l'Inaction
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                                  <div className="bg-black/40 rounded-[2rem] p-8 border border-red-500/10 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] uppercase text-red-400/60 font-black tracking-[0.3em] mb-3">CA Non Capté</span>
                                    <span className="text-3xl font-black text-white tracking-tighter">{renderSafe(normalizedImpact.ca_non_capte_estime || normalizedImpact.ca_perdu_mensuel)}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-[2rem] p-8 border border-red-500/10 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] uppercase text-red-400/60 font-black tracking-[0.3em] mb-3">Visiteurs Perdus / Mois</span>
                                    <span className="text-3xl font-black text-white tracking-tighter">{renderSafe(normalizedImpact.visiteurs_perdus_par_mois || normalizedImpact.visiteurs_perdus_mois)}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-[2rem] p-8 border border-red-500/10 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] uppercase text-red-400/60 font-black tracking-[0.3em] mb-3">Taux de Conv. Actuel</span>
                                    <span className="text-3xl font-black text-white tracking-tighter">{renderSafe(normalizedImpact.taux_conversion_actuel_estime || normalizedImpact.taux_conversion_secteur)}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-[2rem] p-8 border border-emerald-500/20 flex flex-col items-center justify-center text-center bg-emerald-500/5">
                                    <span className="text-[10px] uppercase text-emerald-400/60 font-black tracking-[0.3em] mb-3">Potentiel Après Refonte</span>
                                    <span className="text-3xl font-black text-emerald-400 tracking-tighter">{renderSafe(normalizedImpact.taux_conversion_potentiel)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <section className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 backdrop-blur-md shadow-2xl">
                                <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] mb-10 italic flex items-center gap-3">
                                  <Zap size={16} /> Piliers du Diagnostic
                                </h3>
                                <div className="space-y-8">
                                  {['presence', 'esthetique', 'parcours_ux', 'visibilite_performance'].map((key) => {
                                    const data = normalizedPiliers[key];
                                    const score = data?.score || 5;
                                    const obs = data?.observation || "Analyse automatique en attente.";
                                    const isLow = Number(getSafeScore(score)) <= 5;
                                    return (
                                      <div key={key} className="group">
                                        <div className="flex justify-between text-[11px] uppercase font-black tracking-[0.2em] mb-4 text-slate-400 italic">
                                          <span>{key.replace('_', ' ')}</span>
                                          <span className={isLow ? 'text-red-500' : 'text-emerald-400'}>{getSafeScore(score)}/10</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden mb-5 border border-slate-800/50 p-0.5">
                                          <div 
                                            style={{ width: `${(Number(getSafeScore(score)) || 5) * 10}%` }}
                                            className={`h-full rounded-full ${isLow ? 'bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-emerald-600 to-blue-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                                          ></div>
                                        </div>
                                        <p className="text-[12px] text-slate-500 leading-relaxed font-medium group-hover:text-slate-300 transition-colors">"{renderSafe(obs)}"</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>

                              <div className="space-y-12">
                                <section className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 backdrop-blur-md">
                                  <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] mb-10 italic flex items-center gap-2">
                                    <Activity size={16} /> Core Web Vitals
                                  </h3>
                                  <div className="grid grid-cols-2 gap-6">
                                    {[
                                      { label: 'Performance', value: normalizedCWV.performance_score || 50, color: 'text-white' },
                                      { label: 'Vitesse (LCP)', value: normalizedCWV.lcp || '3.5s', color: 'text-red-400' },
                                      { label: 'Stabilité (CLS)', value: normalizedCWV.cls || '0.02', color: 'text-emerald-400' },
                                      { label: 'Serveur (TTFB)', value: normalizedCWV.ttfb || '750ms', color: 'text-orange-400' },
                                    ].map((v) => (
                                        <div key={v.label} className="bg-black/40 rounded-[2rem] p-8 border border-slate-800/50 flex flex-col items-center justify-center text-center group hover:border-blue-500/30 transition-all">
                                          <span className="text-[10px] uppercase text-slate-500 font-black tracking-[0.3em] mb-3">{v.label}</span>
                                          <span className={`text-3xl font-black ${v.color} font-mono tracking-tighter group-hover:scale-110 transition-transform`}>{renderSafe(v.value)}</span>
                                        </div>
                                    ))}
                                  </div>
                                </section>

                                <section className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 backdrop-blur-md">
                                  <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-8 italic flex items-center gap-2">
                                    <Search size={16} /> Visibilité & Indexation
                                  </h3>
                                  <div className="space-y-6">
                                      <div className="bg-black/40 rounded-2xl p-6 border border-slate-800/50">
                                        <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-3 block">H1 Détecté</span>
                                        <p className="text-sm font-bold text-slate-300 italic">"{renderSafe(normalizedSEO.h1 || "Non détecté")}"</p>
                                      </div>
                                      <div className="flex gap-4">
                                        <div className={`flex-1 p-4 rounded-2xl border ${normalizedSEO.sitemap_present ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} text-center font-black text-[10px] uppercase tracking-widest italic`}>
                                          Sitemap: {normalizedSEO.sitemap_present ? 'ACTIF' : 'MANQUANT'}
                                        </div>
                                        <div className={`flex-1 p-4 rounded-2xl border ${normalizedSEO.robots_txt?.includes('User-agent') || normalizedSEO.robots_txt === 'PRÉSENT' || normalizedSEO.robots_txt === 'Présent' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'} text-center font-black text-[10px] uppercase tracking-widest italic`}>
                                          Robots: {renderSafe(normalizedSEO.robots_txt || 'ABSENT')}
                                        </div>
                                      </div>
                                  </div>
                                </section>

                                <section className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-10 relative overflow-hidden">
                                  <h3 className="text-[12px] font-black text-red-400 uppercase tracking-[0.5em] mb-6 italic flex items-center gap-2">
                                    <AlertTriangle size={16} /> Verdict : {renderSafe(normalizedAudit.verdict_refonte || selectedLead.audit_data?.verdict_refonte || "Diagnostic en attente")}
                                  </h3>
                                  <p className="text-slate-300 text-[14px] leading-relaxed font-bold italic relative z-10">
                                    "{renderSafe(normalizedAudit.verdict_strategique || selectedLead.audit_data?.verdict_strategique || "L'analyse automatique a identifié des anomalies critiques.")}"
                                  </p>
                                </section>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'stratege' && (
                          <div className="max-w-4xl mx-auto space-y-12 pb-20">
                            <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[4rem] p-16 text-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10">
                              <div className="relative z-10">
                                <h3 className="text-[14px] font-black uppercase tracking-[0.6em] mb-6 opacity-60 italic">Angle d'Approche</h3>
                                <h4 className="text-4xl font-black tracking-tighter mb-10 leading-tight italic uppercase">
                                  {renderSafe(normalizedStrategy.angle_approche || "Optimisation du Taux de Conversion")}
                                </h4>
                                <div className="bg-black/30 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
                                  <h5 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-4 italic">Solution Stratégique</h5>
                                  <p className="text-2xl font-medium italic leading-relaxed text-slate-100">
                                    "{renderSafe(normalizedStrategy.solution_strategique || "Une refonte stratégique pour transformer chaque visiteur.")}"
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Buyer Persona Card */}
                              <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800/50 p-10 shadow-2xl">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-8 italic">Profil Décideur</h5>
                                <div className="space-y-6">
                                  <div>
                                    <span className="text-[9px] uppercase text-slate-500 font-black block mb-1">Cible</span>
                                    <p className="text-sm font-bold text-slate-200 italic">{renderSafe(normalizedStrategy.buyer_persona?.profil || "Dirigeant TPE/PME")}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase text-slate-500 font-black block mb-1">Douleur Secrète</span>
                                    <p className="text-sm font-bold text-slate-400 italic">"{renderSafe(normalizedStrategy.buyer_persona?.pain_secret || "Perte de parts de marché face aux concurrents digitaux")}"</p>
                                  </div>
                                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                    <span className="text-[9px] uppercase text-red-400 font-black block mb-1">Réponse à l'objection</span>
                                    <p className="text-[12px] font-bold text-red-200 italic">"{renderSafe(normalizedStrategy.buyer_persona?.reponse_cle || "Le coût de l'inaction est supérieur à l'investissement.")}"</p>
                                  </div>
                                </div>
                              </div>

                              {/* Timing & ROI Card */}
                              <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800/50 p-10 shadow-2xl flex flex-col justify-between">
                                <div>
                                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-8 italic">Logistique & Gains</h5>
                                  <div className="space-y-6">
                                    <div>
                                      <span className="text-[9px] uppercase text-slate-500 font-black block mb-1">Timing Idéal</span>
                                      <p className="text-sm font-bold text-slate-200 italic">{renderSafe(normalizedStrategy.timing_ideal || "Immédiat")}</p>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase text-slate-500 font-black block mb-1">Preuve Sociale</span>
                                      <p className="text-sm font-bold text-slate-300 italic">{renderSafe(normalizedStrategy.preuve_sociale || "Résultats similaires sur des acteurs du même secteur")}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-slate-800/50">
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl text-center">
                                    <span className="text-[9px] uppercase text-emerald-400 font-black block mb-1 tracking-widest">ROI Estimé</span>
                                    <p className="text-lg font-black text-white italic tracking-tighter">{renderSafe(normalizedStrategy.budget_roi || "Rentabilité sous 6 mois")}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'architecture' && (
                          <div className="max-w-6xl mx-auto space-y-12 pb-24">
                            {/* PROJECT HEADER */}
                            <div className={`rounded-[4rem] p-16 relative overflow-hidden shadow-2xl border backdrop-blur-3xl transition-all duration-700 ${
                              normalizedArchitecture.mode_projet === 'refonte_totale' 
                                ? 'bg-red-600/10 border-red-500/20 shadow-red-500/5' 
                                : 'bg-indigo-600/10 border-indigo-500/20 shadow-indigo-500/5'
                            }`}>
                              <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${
                                    normalizedArchitecture.mode_projet === 'refonte_totale'
                                      ? 'border-red-500/50 text-red-500 bg-red-500/5'
                                      : 'border-indigo-500/50 text-indigo-400 bg-indigo-500/5'
                                  }`}>
                                    Mode : {normalizedArchitecture.mode_projet?.replace('_', ' ') || 'Refonte Totale'}
                                  </span>
                                  <span className="text-white/20 text-[10px] font-black">/</span>
                                  <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.5em] italic">V4 Architecte Anti-Template</h3>
                                </div>

                                <h4 className="text-5xl font-black text-white mb-10 max-w-4xl leading-none tracking-tighter italic uppercase">
                                  {renderSafe(normalizedArchitecture.decision_majeure || normalizedArchitecture.proposition_valeur || "Vision de Refonte majeure")}
                                </h4>

                                <div className="flex flex-wrap gap-6 mb-12">
                                  <div className="px-8 py-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                    <span className="text-[9px] font-black uppercase text-white/40 block mb-1 tracking-widest">CTA Principal</span>
                                    <span className="text-sm font-black text-indigo-400 uppercase italic tracking-wider">{normalizedArchitecture.cta_final || normalizedArchitecture.cta || "CONTACT"}</span>
                                  </div>
                                  <div className="px-8 py-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                    <span className="text-[9px] font-black uppercase text-white/40 block mb-1 tracking-widest">Ambiance Visuelle</span>
                                    <span className="text-sm font-black text-white uppercase italic tracking-wider">{normalizedArchitecture.style_visuel || "PREMIUM"}</span>
                                  </div>
                                  <div className="px-8 py-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl backdrop-blur-xl">
                                    <span className="text-[9px] font-black uppercase text-emerald-500/60 block mb-1 tracking-widest">Gain Chiffré Estimé</span>
                                    <span className="text-sm font-black text-emerald-400 italic tracking-wider">{renderSafe(normalizedArchitecture.impact_business_attendu || "+25% de conversion")}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                    <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 italic flex items-center gap-2">
                                      <Zap size={14} /> Priorités Techniques
                                    </h5>
                                    <ul className="space-y-3">
                                      {(normalizedArchitecture.priorites_techniques || ["Performance LCP < 2s", "Mobile First Indexing"])?.map((p: string, i: number) => (
                                        <li key={i} className="text-xs text-slate-400 font-bold italic flex gap-3">
                                          <span className="text-indigo-500">→</span> {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                    <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 italic flex items-center gap-2">
                                      <CheckCircle size={14} /> Quick Wins (24h)
                                    </h5>
                                    <ul className="space-y-3">
                                      {(normalizedArchitecture.quick_wins || ["Compression WebP", "CTA Sticky Mobile"])?.map((q: string, i: number) => (
                                        <li key={i} className="text-xs text-slate-400 font-bold italic flex gap-3">
                                          <span className="text-emerald-500">✓</span> {q}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                              {/* SITEMAP V4 */}
                              <div className="lg:col-span-5 space-y-8">
                                <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800/50 p-12 shadow-2xl relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Network size={120} />
                                  </div>
                                  <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] mb-10 italic flex items-center gap-3">
                                    <Layout size={16} /> Arborescence de Choc
                                  </h4>
                                  <div className="space-y-4">
                                    {(normalizedArchitecture.structure_cible || normalizedArchitecture.arborescence || ["Accueil Optimisé", "Services", "Contact"])?.map((page: string, index: number) => (
                                      <div key={index} className="flex items-center gap-6 bg-black/40 p-6 rounded-[2rem] border border-slate-800/50 group/item hover:border-blue-500/30 transition-all">
                                        <span className="h-10 w-10 flex items-center justify-center bg-blue-500/10 rounded-xl text-blue-500 text-xs font-black">0{index + 1}</span>
                                        <span className="text-[13px] text-slate-200 font-bold uppercase italic tracking-tight">{page}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800/50 p-12 shadow-2xl border-l-[1rem] border-l-orange-500/30">
                                  <h4 className="text-[12px] font-black text-orange-400 uppercase tracking-[0.5em] mb-8 italic flex items-center gap-3">
                                    <Edit3 size={16} /> Décisions Structurelles
                                  </h4>
                                  <div className="space-y-6">
                                    {(normalizedArchitecture.decisions_structurelles || ["Refonte Hero", "Section Confiance"])?.map((d: string, i: number) => (
                                      <div key={i} className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl relative">
                                        <p className="text-sm font-bold text-slate-300 italic leading-relaxed">
                                          "{d}"
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* WIREFRAME V4 */}
                              <div className="lg:col-span-7 space-y-12">
                                <section className="bg-slate-900/40 border border-slate-800/50 rounded-[4rem] p-16 shadow-2xl relative">
                                  <h3 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-12 italic flex items-center gap-3">
                                    <Activity size={16} /> Blueprint Conceptuel
                                  </h3>
                                  
                                  <div className="space-y-12">
                                    <div className="bg-black/60 p-10 rounded-[3rem] border border-indigo-500/10 relative">
                                      <span className="absolute -top-4 left-10 px-4 py-1 bg-indigo-600 text-[9px] font-black uppercase tracking-widest text-white rounded-full">Section Hero</span>
                                      <p className="text-lg text-white font-medium italic leading-relaxed">
                                        {renderSafe(normalizedArchitecture.wireframe_conceptuel?.hero || normalizedArchitecture.wireframe?.hero || normalizedArchitecture.wireframe, "Analyse en cours...")}
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                      <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 relative">
                                        <span className="absolute -top-4 left-8 px-4 py-1 bg-slate-700 text-[9px] font-black uppercase tracking-widest text-white rounded-full">Zone Confiance</span>
                                        <p className="text-sm text-slate-400 font-bold italic">
                                          {renderSafe(normalizedArchitecture.wireframe_conceptuel?.section_preuve || "Intégration avis Google & Badges métiers")}
                                        </p>
                                      </div>
                                      <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 relative">
                                        <span className="absolute -top-4 left-8 px-4 py-1 bg-emerald-600 text-[9px] font-black uppercase tracking-widest text-white rounded-full">Funnel Conv.</span>
                                        <p className="text-sm text-slate-400 font-bold italic">
                                          {renderSafe(normalizedArchitecture.wireframe_conceptuel?.conversion_funnel || "Paiement 3 clips")}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </section>

                                <div className="p-12 bg-blue-500/5 border border-blue-500/20 rounded-[3rem] text-center">
                                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 italic">Vision Architecturale GhostNeural</p>
                                  <p className="text-slate-500 text-xs italic">Chaque pixel est une décision business visant à maximiser le retour immédiat.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'closer' && (
                          <div className="max-w-6xl mx-auto space-y-12 pb-20">
                            {/* 💎 SECTION ROI & INV (ROI FIRST) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                              <div className="bg-black/40 p-10 rounded-[3.5rem] border border-slate-800/50 flex flex-col justify-center">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6 italic">Projection ROI 12 mois</p>
                                <div className="space-y-8">
                                  <div>
                                    <p className="text-3xl font-black text-emerald-400 italic tracking-tighter">
                                      {selectedLead.closer_output?.projected_roi_12months?.ca_additionnel_estime || "+24 000€"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest italic mt-1">CA Additionnel Projeté</p>
                                  </div>
                                  <div className="pt-6 border-t border-slate-800">
                                    <p className="text-lg text-white font-black italic">
                                      {selectedLead.closer_output?.projected_roi_12months?.fct_multiplicateur || "8.2x"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest italic mt-1">Multiplicateur d'Investissement</p>
                                  </div>
                                </div>
                              </div>

                              <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                  <ShieldCheck size={160} />
                                </div>
                                <div className="relative z-10">
                                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.4em] mb-4 italic">Offre Commerciale GhostAgency</p>
                                  <h3 className="text-4xl font-black text-white italic tracking-tighter mb-8 leading-none">
                                    {selectedLead.closer_output?.offre_packagee?.nom || "Plan de Transformation Premium"}
                                  </h3>
                                  <div className="flex flex-wrap gap-4 mb-10">
                                    {(selectedLead.closer_output?.offre_packagee?.arguments_cles || ["Performance Garantie", "Design Conversion-First", "Accompagnement ROI"]).map((arg: string, i: number) => (
                                      <span key={i} className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10 uppercase italic">
                                        {arg}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex items-baseline gap-4">
                                    <span className="text-6xl font-black text-white tracking-tighter italic">
                                      {selectedLead.closer_output?.offre_packagee?.prix_recommande || "2 900€ HT"}
                                    </span>
                                    <span className="text-indigo-100 text-sm font-bold uppercase tracking-widest italic opacity-60">HT / Investissement</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-16 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
                              <h4 className="text-[14px] font-black text-blue-500 uppercase tracking-[0.6em] mb-16 italic text-center">Proposition Commerciale Premium</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                <div className="space-y-12">
                                  {/* 1. PROBLÈME */}
                                  <div className="group">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] block mb-4 italic group-hover:text-blue-400 transition-colors">01. Le Problème Central</label>
                                    <p className="text-2xl font-black text-white italic tracking-tighter leading-tight">
                                      "{selectedLead.proposal_data?.resume_probleme || "Identification du goulot d'étranglement..."}"
                                    </p>
                                  </div>

                                  {/* 2. IMPACT */}
                                  <div className="group">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] block mb-4 italic group-hover:text-red-400 transition-colors">02. L'Impact Business</label>
                                    <p className="text-lg text-slate-300 font-medium italic leading-relaxed">
                                      {selectedLead.proposal_data?.impact_business || "Calcul du coût d'inaction en cours..."}
                                    </p>
                                  </div>

                                  {/* 3. SOLUTION */}
                                  <div className="group">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] block mb-4 italic group-hover:text-indigo-400 transition-colors">03. La Solution GhostAgency</label>
                                    <p className="text-lg text-slate-300 font-medium italic leading-relaxed">
                                      {selectedLead.proposal_data?.solution_resume || "Conception de l'architecture de conversion..."}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-12">
                                  {/* 4. ROI & PRIX (GROUPÉS) */}
                                  <div className="bg-black/40 rounded-[3rem] p-10 border border-white/5 shadow-inner">
                                    <div className="mb-8">
                                      <label className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.4em] block mb-2 italic">04. ROI Projeté (12m)</label>
                                      <p className="text-3xl font-black text-white italic tracking-tighter">
                                        {selectedLead.proposal_data?.roi || selectedLead.closer_output?.projected_roi_12months?.ca_additionnel_estime || "+24 000€"}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-blue-400 tracking-[0.4em] block mb-2 italic">05. Investissement HT</label>
                                      <p className="text-3xl font-black text-white italic tracking-tighter">
                                        {selectedLead.proposal_data?.offre || selectedLead.closer_output?.offre_packagee?.prix_recommande || "2 900€"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* 6. GARANTIE */}
                                  <div className="group">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] block mb-4 italic group-hover:text-emerald-400 transition-colors">06. Garantie de Performance</label>
                                    <p className="text-sm text-slate-400 font-bold italic leading-relaxed">
                                      {selectedLead.proposal_data?.garantie || "Optimisation technique garantie selon les standards GhostNeural."}
                                    </p>
                                  </div>

                                  {/* 7. NEXT STEP */}
                                  <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] relative">
                                    <div className="absolute -top-3 -right-3 h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                                      <CheckCircle size={16} className="text-white" />
                                    </div>
                                    <label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] block mb-2 italic">07. Étape Suivante</label>
                                    <p className="text-sm text-white font-black italic">
                                      {selectedLead.proposal_data?.next_step || "Démarrage projeté sous 7 jours."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 🗺️ ROADMAP DE TRANSFORMATION */}
                            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[4rem] p-16">
                              <h4 className="text-[12px] font-black text-blue-500 uppercase tracking-[0.6em] mb-16 italic text-center">Feuille de Route GhostNeural</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                                <div className="hidden md:block absolute top-[2.5rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent z-0"></div>
                                
                                {(selectedLead.closer_output?.roadmap || [
                                  { phase: "Sprint 1", actions: ["Optimisation Perf", "CTA Setup"], delai: "48h", impact: "Stop Hémorragie" },
                                  { phase: "Sprint 2", actions: ["Refonte Design", "Copywriting"], delai: "10j", impact: "Gain Confiance" },
                                  { phase: "Sprint 3", actions: ["Scaling SEO", "Automations"], delai: "Continu", impact: "Domination Locale" }
                                ]).map((step: any, i: number) => (
                                  <div key={i} className="relative z-10 group">
                                    <div className="w-12 h-12 bg-slate-900 border-2 border-slate-800 rounded-2xl flex items-center justify-center text-blue-500 font-black mb-8 group-hover:border-blue-500 group-hover:bg-blue-500/10 transition-all">
                                      {i + 1}
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">{step.delai}</p>
                                    <h5 className="text-xl font-black text-white italic mb-4 tracking-tighter">{step.phase}</h5>
                                    <ul className="space-y-3 mb-6">
                                      {step.actions?.map((action: string, idx: number) => (
                                        <li key={idx} className="text-sm text-slate-500 flex items-center gap-2">
                                          <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                                          {action}
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic mb-1">Objectif</p>
                                      <p className="text-xs text-emerald-100/60 font-medium italic">{step.impact}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'email' && (
                          <div className="max-w-4xl mx-auto py-8">
                            <section className="bg-[#0f172a]/80 border border-white/5 rounded-[4rem] overflow-hidden shadow-2xl backdrop-blur-2xl">
                              <div className="p-16 space-y-12">
                                <div>
                                  <label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] block mb-4 italic">Objet Premium</label>
                                  <div className="text-3xl font-black text-white border-b border-slate-800 pb-8 italic tracking-tighter">
                                    {selectedLead.email_objet || "Urgence Digitale : Analyse GhostNeural"}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] block mb-4 italic">Corps du Message</label>
                                  <div className="text-slate-100 text-[18px] leading-[1.8] italic whitespace-pre-wrap font-medium bg-white/2 rounded-[2rem] p-10 border border-white/5">
                                    {selectedLead.email_body || "Analyse en cours..."}
                                  </div>
                                </div>
                              </div>
                            </section>
                          </div>
                        )}

                        {activeTab === 'orchestrateur' && (
                          <div className="max-w-4xl mx-auto space-y-10">
                            <section className="bg-black/80 border border-slate-800 rounded-[3rem] p-12 font-mono shadow-2xl border-l-[1rem] border-l-blue-600">
                              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.6em] mb-12 italic">GHOST-NET BRAIN OS v4</h3>
                              <div className="space-y-6 text-[12px]">
                                {[
                                  { tag: 'INIT', msg: `Mission démarrée pour ${selectedLead.nom}`, color: 'text-blue-500' },
                                  { tag: 'SCAN', msg: `Performance détectée: ${normalizedCWV.performance_score || 'N/A'}/100`, color: 'text-amber-500' },
                                  { tag: 'READY', msg: `Audit complet stocké pour ${selectedLead.id}`, color: 'text-blue-400' },
                                ].map((log, i) => (
                                  <div key={i} className="flex gap-6 items-center">
                                    <span className="text-slate-700">{new Date().toLocaleTimeString()}</span>
                                    <span className={`${log.color} font-black italic`}>{log.tag}</span>
                                    <span className="text-slate-400">{log.msg}</span>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>
                        )}
                      </>
                    );
                  })()}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 relative overflow-hidden">
            <div className="absolute h-[40rem] w-[40rem] bg-blue-600/5 rounded-full blur-[150px] -z-10"></div>
            <div className="h-32 w-32 bg-slate-900 shadow-2xl rounded-[3.5rem] flex items-center justify-center text-slate-700 mb-10 border border-slate-800/50 group hover:border-blue-500/50 transition-all duration-700">
              <Activity size={60} className="group-hover:scale-110 transition-transform duration-700 text-slate-800 group-hover:text-blue-500/50" />
            </div>
            <h2 className="text-4xl font-black text-white italic mb-4 tracking-tighter uppercase">GhostNeural <span className="text-blue-600">Off-line</span></h2>
            <p className="text-slate-500 text-lg max-w-md font-medium tracking-tight">Sélectionnez un lead pour activer le moteur d'analyse critique et lancer le protocole de choc.</p>
          </div>
        )}
      </main>

      {/* 🔴 NOTIFICATION TOAST (SANS MOTION) */}
      {notification && (
        <div 
          className={`fixed bottom-10 right-10 z-[100] px-8 py-5 rounded-[2rem] border shadow-2xl backdrop-blur-3xl flex items-center gap-4 ${
            notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 
            notification.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 
            'bg-blue-500/20 border-blue-500/30 text-blue-400'
          }`}
        >
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${notification.type === 'success' ? 'bg-emerald-500/20' : notification.type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
             {notification.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          </div>
          <p className="text-sm font-black italic tracking-tight uppercase">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* 🔴 CAMPAIGN MODAL (SANS MOTION) */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-blue-500/30 rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <button onClick={() => setIsCampaignModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Lancer une <span className="text-blue-500">Chasse</span></h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10 italic">Intelligence Google Places & Auto-Pipeline</p>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-2 block italic">Secteur d'Activité</label>
                <input 
                  type="text" 
                  placeholder="Ex: Restaurant, Plombier..."
                  value={campaignData.secteur}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, secteur: e.target.value }))}
                  className="w-full bg-black/40 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-2 block italic">Ville ou Département (ex: 06)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Nice, Cannes, 06..."
                  value={campaignData.ville}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, ville: e.target.value }))}
                  className="w-full bg-black/40 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-2 block italic">Nb de Leads</label>
                  <input 
                    type="number" 
                    value={campaignData.count}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                    className="w-full bg-black/40 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button 
                    onClick={() => setCampaignData(prev => ({ ...prev, pipeline: !prev.pipeline }))}
                    className={`h-full border rounded-2xl flex items-center justify-between px-6 transition-all ${
                      campaignData.pipeline ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'
                    }`}
                  >
                    <span className="text-[9px] font-black tracking-widest uppercase">Auto-Pipeline</span>
                    <div className={`h-4 w-4 rounded-full ${campaignData.pipeline ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}></div>
                  </button>
                </div>
              </div>

              <button 
                onClick={handleLaunchCampaign}
                disabled={!campaignData.secteur || !campaignData.ville || isLaunchingCampaign}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 disabled:opacity-50 mt-4 group"
              >
                {isLaunchingCampaign ? 'DÉPLOIEMENT...' : 'ACTIVER LE CHASSEUR'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(2, 6, 23, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
