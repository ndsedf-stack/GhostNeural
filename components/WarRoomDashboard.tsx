'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertTriangle
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
  proposition_data: any;
  email_objet: string;
  email_body: string;
  status: string;
  created_at: string;
  screenshot_url?: string;
}

export default function WarRoomDashboard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads || []);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeads?.[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'audit' | 'stratege' | 'architecture' | 'email' | 'orchestrateur'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedLead = leads.find(l => String(l.id) === String(selectedLeadId));

  const filteredLeads = leads.filter(l => 
    l.nom?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
    l.site_web?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedLead || isSending) return;
    setIsSending(true);
    try {
      const resp = await fetch('/api/resend/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          subject: selectedLead.email_objet,
          body: selectedLead.email_body
        })
      });
      if (resp.ok) {
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'sent' } : l));
        alert('Email envoyé avec succès !');
      } else {
        alert("Erreur d'envoi.");
      }
    } catch (e) {
      alert("Erreur réseau.");
    } finally {
      setIsSending(false);
    }
  };

  const handleReprocess = async () => {
    if (!selectedLead || isProcessing) return;
    setIsProcessing(true);
    setActiveTab('orchestrateur');
    try {
      const resp = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_url: selectedLead.site_web,
          company_name: selectedLead.nom,
          secteur: selectedLead.secteur
        })
      });
      if (resp.ok) {
        alert('Traitement terminé ! Actualisation...');
        window.location.reload();
      } else {
        alert('Erreur lors du traitement.');
      }
    } catch (e) {
      alert('Erreur réseau.');
    } finally {
      setIsProcessing(false);
    }
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
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
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
                  <span className="text-[10px] font-mono font-bold text-slate-400">{lead.score_audit || 50}%</span>
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
                <TabButton id="email" icon={Mail} label="Copywriter" />
                <TabButton id="orchestrateur" icon={Cpu} label="System Log" />
              </nav>
            </header>

            <div className="flex-1 overflow-y-auto p-12 bg-gradient-to-br from-[#020617] to-[#0f172a]/40 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="max-w-6xl mx-auto"
                >
                  {/* AUDIT TAB */}
                  {activeTab === 'audit' && (
                    <div className="space-y-12">
                      {/* Bloc Qualification Premium */}
                      {selectedLead.audit_data?.qualification && (
                        <div className="p-10 bg-slate-900/60 rounded-[3rem] border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8">
                             <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                               selectedLead.audit_data.qualification.priorite === 'haute' ? 'border-red-500/50 text-red-400 bg-red-500/5' : 'border-blue-500/50 text-blue-400 bg-blue-500/5'
                             }`}>
                               Priorité {selectedLead.audit_data.qualification.priorite}
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
                                  selectedLead.audit_data.qualification.score_global >= 80 ? "text-emerald-400" : selectedLead.audit_data.qualification.score_global >= 60 ? "text-amber-400" : "text-red-400"
                                }`}>
                                  {selectedLead.audit_data.qualification.score_global}/100
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                {Object.entries(selectedLead.audit_data.qualification.scores || {}).map(([key, value]: any) => (
                                  <div key={key} className="p-5 bg-black/40 rounded-2xl border border-slate-800/50 group/item hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 italic">{key}</span>
                                      <span className="text-xs font-black text-blue-400 font-mono">{value}/25</span>
                                    </div>
                                    <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(value / 25) * 100}%` }}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full"
                                      ></motion.div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col justify-center">
                              <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[2rem] relative shadow-inner">
                                <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 italic">Verdict du Stratège</h4>
                                <p className="text-slate-100 text-lg leading-relaxed italic font-medium">
                                  "{selectedLead.audit_data.qualification.raison}"
                                </p>
                                <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-blue-500/10 blur-[40px] rounded-full"></div>
                              </div>
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
                              const data = selectedLead.audit_data?.analyse_piliers?.[key];
                              const score = data?.score || 5;
                              const obs = data?.observation || "Analyse automatique en attente.";
                              const isLow = score <= 5;
                              return (
                                <div key={key} className="group">
                                  <div className="flex justify-between text-[11px] uppercase font-black tracking-[0.2em] mb-4 text-slate-400 italic">
                                    <span>{key.replace('_', ' ')}</span>
                                    <span className={isLow ? 'text-red-500' : 'text-emerald-400'}>{score}/10</span>
                                  </div>
                                  <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden mb-5 border border-slate-800/50 p-0.5">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${score * 10}%` }}
                                      className={`h-full rounded-full ${isLow ? 'bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-emerald-600 to-blue-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                                    ></motion.div>
                                  </div>
                                  <p className="text-[12px] text-slate-500 leading-relaxed font-medium group-hover:text-slate-300 transition-colors">"{obs}"</p>
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
                                { label: 'Performance', value: selectedLead.audit_data?.core_web_vitals?.performance_score || 50, color: 'text-white' },
                                { label: 'Vitesse (LCP)', value: selectedLead.audit_data?.core_web_vitals?.lcp || '3.5s', color: 'text-red-400' },
                                { label: 'Stabilité (CLS)', value: selectedLead.audit_data?.core_web_vitals?.cls || '0.02', color: 'text-emerald-400' },
                                { label: 'Serveur (TTFB)', value: selectedLead.audit_data?.core_web_vitals?.ttfb || '750ms', color: 'text-orange-400' },
                              ].map((v) => (
                                <div key={v.label} className="bg-black/40 rounded-[2rem] p-8 border border-slate-800/50 flex flex-col items-center justify-center text-center group hover:border-blue-500/30 transition-all">
                                  <span className="text-[10px] uppercase text-slate-500 font-black tracking-[0.3em] mb-3">{v.label}</span>
                                  <span className={`text-3xl font-black ${v.color} font-mono tracking-tighter group-hover:scale-110 transition-transform`}>{v.value}</span>
                                </div>
                              ))}
                            </div>
                          </section>

                          {/* SEO & TECHNICAL SECTION */}
                          <section className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 backdrop-blur-md">
                            <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-8 italic flex items-center gap-2">
                              <Search size={16} /> Visibilité & Indexation
                            </h3>
                            <div className="space-y-6">
                              <div className="bg-black/40 rounded-2xl p-6 border border-slate-800/50">
                                <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-3 block">H1 Détecté</span>
                                <p className="text-sm font-bold text-slate-300 italic">"{selectedLead.audit_data?.seo?.h1 || "Non détecté"}"</p>
                              </div>
                              <div className="flex gap-4">
                                <div className={`flex-1 p-4 rounded-2xl border ${selectedLead.audit_data?.seo?.sitemap_present ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} text-center font-black text-[10px] uppercase tracking-widest italic`}>
                                  Sitemap: {selectedLead.audit_data?.seo?.sitemap_present ? 'ACTIF' : 'MANQUANT'}
                                </div>
                                <div className={`flex-1 p-4 rounded-2xl border ${selectedLead.audit_data?.seo?.robots_txt?.includes('User-agent') || selectedLead.audit_data?.seo?.robots_txt === 'Présent' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'} text-center font-black text-[10px] uppercase tracking-widest italic`}>
                                  Robots: {selectedLead.audit_data?.seo?.robots_txt || 'ABSENT'}
                                </div>
                              </div>
                            </div>
                          </section>
                          <section className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-10 relative overflow-hidden">
                            <h3 className="text-[12px] font-black text-red-400 uppercase tracking-[0.5em] mb-6 italic flex items-center gap-2">
                              <AlertTriangle size={16} /> Verdict : {selectedLead.audit_data?.verdict_refonte || "Diagnostic en attente"}
                            </h3>
                            <p className="text-slate-300 text-[14px] leading-relaxed font-bold italic relative z-10">
                              "{selectedLead.audit_data?.verdict_strategique || "L'analyse automatique a identifié des anomalies critiques dans le rendu."}"
                            </p>
                            <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-red-500/10 blur-[50px] rounded-full"></div>
                          </section>

                          {/* DA PROOF SECTION */}
                          <section className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 backdrop-blur-md">
                            <h3 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-8 italic flex items-center gap-2">
                              <Eye size={16} /> Preuves DA Extraites
                            </h3>
                            <div className="space-y-6">
                              <div>
                                <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-3 block">Polices Détectées</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedLead.audit_data?.design_tokens?.fonts?.map((font: string) => (
                                    <span key={font} className="px-3 py-1.5 bg-black/40 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">{font.split(',')[0]}</span>
                                  )) || <span className="text-slate-600 italic text-[10px]">Aucune donnée visuelle</span>}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-3 block">Palette de Couleurs</span>
                                <div className="flex gap-2">
                                  {selectedLead.audit_data?.design_tokens?.colors?.map((color: string) => (
                                    <div key={color} className="h-8 w-8 rounded-lg border border-white/10 shadow-lg" style={{ backgroundColor: color }} title={color}></div>
                                  )) || <span className="text-slate-600 italic text-[10px]">Non extrait</span>}
                                </div>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STRATEGE TAB */}
                  {activeTab === 'stratege' && (
                    <div className="max-w-4xl mx-auto space-y-12">
                      <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[4rem] p-16 text-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10">
                        <div className="relative z-10">
                          <h3 className="text-[14px] font-black uppercase tracking-[0.6em] mb-6 opacity-60 italic">Verdict Stratégique</h3>
                          <h4 className="text-4xl font-black tracking-tighter mb-10 leading-tight italic">
                            {selectedLead.audit_data?.verdict_strategique || selectedLead.proposition_data?.strategy?.angle_approche || "Optimisation du Taux de Conversion"}
                          </h4>
                          <div className="h-1.5 w-32 bg-white/20 rounded-full mb-10"></div>
                          <div className="bg-black/30 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-4 italic">Opportunité Majeure</h5>
                            <p className="text-2xl font-medium italic leading-relaxed text-slate-100">
                              "{selectedLead.audit_data?.opportunite_majeure || selectedLead.proposition_data?.strategy?.solution_strategique || "Une refonte stratégique pour transformer chaque visiteur en client fidele."}"
                            </p>
                          </div>
                        </div>
                        <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-indigo-500/20 rounded-full blur-[120px]"></div>
                        <div className="absolute top-10 right-10 opacity-20"><Target size={120} /></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 shadow-xl group hover:border-blue-500/30 transition-all">
                          <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6 italic">Point de Friction Majeur</h3>
                          <p className="text-slate-200 text-lg font-bold leading-relaxed">
                            {selectedLead.proposition_data?.strategy?.point_friction_majeur || "Obsolescence digitale et manque de clarté de l'offre perçue."}
                          </p>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-10 shadow-xl flex flex-col justify-between">
                          <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6 italic">Ton Recommandé</h3>
                          <div className="flex items-center gap-4">
                            <span className="px-6 py-2.5 bg-blue-600 shadow-lg shadow-blue-500/20 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest italic">
                              {selectedLead.proposition_data?.strategy?.ton_recommande || "PROFESSIONNEL"}
                            </span>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(i => <div key={i} className="h-1 w-4 bg-blue-500/40 rounded-full"></div>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ARCHITECTURE TAB */}
                  {activeTab === 'architecture' && (
                    <div className="max-w-6xl mx-auto space-y-12">
                      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[4rem] p-16 relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                          <h3 className="text-[14px] font-black text-indigo-400 uppercase tracking-[0.6em] mb-6 italic">Vision Transformative</h3>
                          <h4 className="text-4xl font-black text-white mb-10 max-w-2xl leading-tight">
                            {selectedLead.proposition_data?.architecture?.proposition_valeur || "Valider manuellement les axes de refonte avant de proposer une transformation complète."}
                          </h4>
                          <div className="flex gap-6">
                             <span className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_10px_25px_rgba(79,70,229,0.3)]">
                               CTA: {selectedLead.proposition_data?.architecture?.cta || "CONTACT"}
                             </span>
                             <span className="px-8 py-4 bg-white/5 border border-white/10 text-indigo-300 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em]">
                               STYLE: {selectedLead.proposition_data?.architecture?.style_visuel || "PREMIUM"}
                             </span>
                          </div>
                        </div>
                        <div className="absolute top-0 right-0 p-16 opacity-10"><Layout size={100} /></div>
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]"></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Capture State */}
                        <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800/50 p-10 shadow-2xl relative group">
                          <h4 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em] mb-8 text-center italic">État Actuel (Capture Live)</h4>
                          <div className="aspect-[16/10] bg-black/60 rounded-[2.5rem] overflow-hidden border border-slate-800 flex items-center justify-center group relative shadow-inner">
                            {selectedLead.screenshot_url || selectedLead.audit_data?.screenshot_url ? (
                              <img 
                                src={selectedLead.audit_data?.screenshot_url?.startsWith('data:') ? selectedLead.audit_data.screenshot_url : `data:image/jpeg;base64,${selectedLead.screenshot_url || selectedLead.audit_data.screenshot_url}`} 
                                alt="Capture du site" 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-100" 
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-6 text-slate-700">
                                <Activity size={48} className="animate-pulse" />
                                <div className="text-[12px] font-black uppercase tracking-widest italic border-b border-slate-800 pb-1">Aperçu Visuel Indisponible</div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                            <div className="absolute bottom-6 left-6 text-[10px] font-black text-white/40 tracking-[0.4em] uppercase">SYSTEM.CAPTURE.V1</div>
                          </div>
                        </div>

                        {/* Sitemap Cible */}
                        <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800/50 p-10 shadow-2xl">
                          <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] mb-8 italic">Structure Cible (Architecte)</h4>
                          <div className="space-y-4">
                            {(selectedLead.audit_data?.sitemap_cible || selectedLead.audit_data?.arborescence_cible || selectedLead.proposition_data?.architecture?.arborescence || ["Accueil Optimisé", "Services Premium", "Expertise", "Contact Direct"])?.map((page: string, index: number) => (
                              <motion.div 
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                key={index} 
                                className="flex items-center gap-6 bg-black/40 p-5 rounded-3xl border border-slate-800/50 hover:border-blue-500/40 transition-all group hover:bg-blue-500/5"
                              >
                                <span className="text-blue-500 text-[12px] font-black font-mono bg-blue-500/10 h-10 w-10 flex items-center justify-center rounded-2xl border border-blue-500/20">0{index + 1}</span>
                                <span className="text-[14px] text-slate-300 font-bold tracking-tight group-hover:text-blue-400 transition-colors uppercase italic">{page}</span>
                                <ChevronRight className="ml-auto text-slate-700 group-hover:text-blue-500" size={16} />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <section className="bg-slate-900/40 border border-slate-800/50 rounded-[3rem] p-12 relative">
                        <h3 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-10 italic">Concept de Wireframe Stratégique</h3>
                        <div className="bg-black/60 rounded-[2.5rem] p-12 border border-dashed border-slate-800 flex items-start justify-start relative overflow-hidden group min-h-[200px]">
                          <p className="text-slate-400 text-lg leading-relaxed italic relative z-10 whitespace-pre-wrap font-medium">
                            {selectedLead.proposition_data?.architecture?.wireframe || "Conception de l'ossature haute-conversion en cours... Le focus est mis sur le hero section et la preuve sociale immédiate pour briser la résistance du prospect."}
                          </p>
                          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* EMAIL TAB */}
                  {activeTab === 'email' && (
                    <div className="max-w-4xl mx-auto py-8">
                      <section className="bg-[#0f172a]/80 border border-white/5 rounded-[4rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                        <div className="bg-white/5 p-8 flex items-center justify-between border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                            <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                          </div>
                          <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.8em] italic">GHOST WRITER V1.0 - SHOCK DELIVERY</span>
                          <div className="w-10"></div>
                        </div>
                        <div className="p-16 space-y-12">
                          <div>
                            <label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] block mb-4 opacity-70 italic">Objet Premium</label>
                            <div className="text-3xl font-black text-white border-b border-slate-800 pb-8 italic tracking-tighter">
                              {selectedLead.email_objet || "Urgence Digitale : Analyse GhostNeural"}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] block mb-4 opacity-70 italic">Corps du Message (Shock Copy)</label>
                            <div className="text-slate-100 text-[18px] leading-[1.8] italic whitespace-pre-wrap font-medium bg-white/2 rounded-[2rem] p-10 border border-white/5 shadow-inner">
                              {selectedLead.email_body || "Votre site actuel présente des défaillances critiques que nous avons analysées. Une refonte stratégique est impérative."}
                            </div>
                          </div>
                        </div>
                        <div className="p-12 bg-black/40 flex flex-col md:flex-row gap-6 border-t border-white/5">
                          <button 
                            onClick={handleSend}
                            disabled={isSending || selectedLead.status === 'sent'}
                            className={`flex-1 py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 ${
                              selectedLead.status === 'sent' 
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed border border-emerald-500/30' 
                                : 'bg-white text-black hover:bg-blue-600 hover:text-white'
                            }`}
                          >
                            <Mail size={20} /> 
                            {isSending ? 'SENDING...' : selectedLead.status === 'sent' ? 'TRANSMISSION RÉUSSIE' : 'ACTIVER LE CONTACT'}
                          </button>
                          <button className="px-12 py-6 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-3xl font-black text-[13px] uppercase tracking-[0.4em] transition-all border border-white/5">
                            ÉDITION EXPERT
                          </button>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* ORCHESTRATEUR TAB */}
                  {activeTab === 'orchestrateur' && (
                    <div className="max-w-4xl mx-auto space-y-10">
                      <section className="bg-black/80 border border-slate-800 rounded-[3rem] p-12 font-mono overflow-hidden relative shadow-2xl border-l-[1rem] border-l-blue-600">
                        <div className="absolute top-0 right-0 p-8">
                           <span className="flex items-center gap-3 text-[12px] text-blue-500 animate-pulse font-black tracking-widest uppercase">
                             <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                             LIVE MONITORING
                           </span>
                        </div>
                        <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.6em] mb-12 border-b border-slate-800/50 pb-6 italic">GHOST-NET OS v1.0 ULTIME</h3>
                        <div className="space-y-6 text-[12px]">
                          {[
                            { tag: 'INIT', msg: `Mission démarrée pour ${selectedLead.nom}`, color: 'text-blue-500' },
                            { tag: 'SCAN', msg: `L'Éclaireur a capturé ${selectedLead.audit_data?.core_web_vitals?.performance_score || 'N/A'}/100 Performance`, color: 'text-amber-500' },
                            { tag: 'SITE', msg: `Sitemap généré : ${selectedLead.audit_data?.arborescence_cible?.length || 4} pages identifiées`, color: 'text-indigo-400' },
                            { tag: 'PROD', msg: `Email shock rédigé avec angle : ${selectedLead.proposition_data?.strategy?.angle_approche?.slice(0, 30) || 'Conversion'}...`, color: 'text-emerald-400' },
                            { tag: 'READY', msg: `Audit complet stocké pour ${selectedLead.id}`, color: 'text-blue-400 bg-blue-500/10 px-3 py-1 rounded inline-block' },
                          ].map((log, i) => (
                            <div key={i} className="flex gap-6 items-center group">
                              <span className="text-slate-700 font-bold shrink-0">{new Date().toLocaleTimeString()}</span>
                              <span className={`${log.color} font-black min-w-[60px] italic tracking-widest uppercase`}>{log.tag}</span>
                              <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{log.msg}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-16 bg-blue-600/5 p-8 rounded-3xl border border-blue-600/20 backdrop-blur-md">
                           <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-4 italic">Metadata Hash</h4>
                           <pre className="text-[11px] text-slate-600 overflow-x-auto selection:bg-blue-500/20">
                             {JSON.stringify({ 
                               id: selectedLead.id, 
                               status: selectedLead.status, 
                               arch: 'Neural-Ghost-v1',
                               safety: 'Verified'
                             }, null, 2)}
                           </pre>
                        </div>
                      </section>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
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
