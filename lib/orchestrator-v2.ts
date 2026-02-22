// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATEUR GHOSTNEURAL — Pipeline Complet V2
// ─────────────────────────────────────────────────────────────────────────────
// Flux : Éclaireur → Qualification → Scan Full → Audit → Stratège → Architecte → Copywriter → Critique → Envoi
//
// RÈGLES ORCHESTRATEUR :
// 1. Chaque agent reçoit UNIQUEMENT ce dont il a besoin (pas de JSON entier en vrac)
// 2. Chaque étape a un guard de validation avant de passer à la suivante
// 3. Un échec ne bloque pas — il est loggé et le lead est marqué avec son statut exact
// ─────────────────────────────────────────────────────────────────────────────

import { eclaireurAgent }        from '@/lib/agents/eclaireur';
import { runQualificationAgent } from '@/lib/agents/qualification';
import { runEnrichisseurAgent }  from '@/lib/agents/enrichisseur';
import { scanFullSite, scanQuick } from '@/lib/tools/pageScanner';
import { runUltraAudit }         from '@/lib/agents/audit';
import { runLighthouse }         from '@/lib/tools/lighthouseRunner';
import { strategeAgent }         from '@/lib/agents/stratege';
import { runArchitecteAgent }    from '@/lib/agents/architecte';
import { runCloserAgent }        from '@/lib/agents/closer';
import { runProposalGenerator }  from '@/lib/agents/proposal';
import { runCopywriterAgent }    from '@/lib/agents/copywriter';
import { critiqueAgent }         from '@/lib/agents/critique';
import { supabaseAdmin }         from '@/lib/supabase/admin';
import { monitoring }            from '@/lib/monitoring';
import { dataReducer }           from '@/lib/utils/data-reducer';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface LeadInput {
  nom: string;
  site_web: string;
  secteur: string;
  ville: string;
  email?: string;
}

interface PipelineResult {
  leadId: string | null;
  status: PipelineStatus;
  score?: number;
  raison_rejet?: string;
  email_ready?: boolean;
}

type PipelineStatus =
  | 'rejected_eclaireur'
  | 'rejected_qualification'
  | 'rejected_quality'
  | 'rejected_no_email'
  | 'error_scan'
  | 'error_audit'
  | 'error_pipeline'
  | 'email_ready'
  | 'sent';

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS — Validations entre chaque étape
// ─────────────────────────────────────────────────────────────────────────────

// Guard 1 : L'Éclaireur a-t-il donné le GO ?
function guardEclaireur(result: any): boolean {
  return result?.go === true && result?.score_eclaireur >= 35;
}

// Guard 2 : La Qualification confirme-t-elle l'intérêt ?
function guardQualification(result: any): boolean {
  return result?.prospect_interessant === true
    && result?.score_global >= 40; // Seuil v2 plus permissif pour laisser l'Enrichisseur approfondir
}

// Guard 3 : L'Audit est-il exploitable ?
function guardAudit(result: any): boolean {
  return !result?.error
    && typeof result?.score_global === 'number'
    && result?.analyse_piliers !== undefined;
}

// Guard 4 : L'email est-il envoyable ?
function guardCritique(result: any): boolean {
  return result?.envoyable === true && result?.qualite_score >= 60;
}

// Guard 5 : Y a-t-il un email destinataire ?
function guardEmail(lead: LeadInput, eclaireurResult: any): string | null {
  return lead.email
    || eclaireurResult?.email_detecte
    || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — Sauvegarde en base
// ─────────────────────────────────────────────────────────────────────────────
async function saveLead(data: any): Promise<string> {
  console.log('[DB] saveLead status:', data.status);
  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .upsert(data, { onConflict: 'site_web' })
    .select('id')
    .single();

  if (error) {
    console.error('[DB] Error saving lead:', error);
    throw error;
  }

  return inserted.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function runPipeline(lead: LeadInput, existingLeadId?: string): Promise<PipelineResult> {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[Pipeline] START → ${lead.nom} | ${lead.site_web} (ID: ${existingLeadId || 'NEW'})`);
  console.log(`${'─'.repeat(60)}`);

  let leadId = existingLeadId;

  // ════════════════════════════════════════════════════════════════
  // PHASE 0 — ÉCLAIREUR
  // ════════════════════════════════════════════════════════════════
  console.log(`[0/7] Éclaireur → scan rapide...`);
  let quickData: any;
  try {
    quickData = await scanQuick(lead.site_web);
  } catch (e) {
    console.error('[0/7] scanQuick failed:', e);
    monitoring.captureLeadProcessed(lead.site_web, 'error_pipeline', 0);
    return { leadId: leadId || null, status: 'error_pipeline', raison_rejet: 'scanQuick failed' };
  }

  const eclaireurResult = await eclaireurAgent(
    quickData,
    lead.nom,
    lead.secteur,
    lead.ville,
    lead.email
  );
  console.log(`[0/7] Éclaireur → score: ${eclaireurResult.score_eclaireur}/100 | GO: ${eclaireurResult.go}`);

  if (!guardEclaireur(eclaireurResult)) {
    monitoring.captureLeadProcessed(lead.site_web, 'rejected_eclaireur', eclaireurResult.score_eclaireur);
    
    const updateData = {
      ...lead,
      status: 'rejected',
      rejection_stage: 'eclaireur',
      score: eclaireurResult.score_eclaireur,
      priorite: eclaireurResult.priorite,
      raison_rejet: eclaireurResult.raison_rejet,
      red_flags: eclaireurResult.red_flags,
      updated_at: new Date(),
      processed_at: new Date().toISOString()
    };

    if (leadId) {
      await supabaseAdmin.from('leads').update(updateData).eq('id', leadId);
    } else {
      leadId = await saveLead(updateData);
    }
    
    return { leadId, status: 'rejected_eclaireur', score: eclaireurResult.score_eclaireur, raison_rejet: eclaireurResult.raison_rejet };
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 1 — QUALIFICATION
  // ════════════════════════════════════════════════════════════════
  console.log(`[1/7] Qualification → scoring 4 piliers...`);
  const qualifResult = await runQualificationAgent(
    lead.site_web,
    lead.secteur,
    {
      ...quickData,
      design_level: eclaireurResult.design_level,
      trust_signals: eclaireurResult.trust_signals
    },
    lead.nom,
    lead.ville
  );
  console.log(`[1/7] Qualification → score: ${qualifResult.score_global}/100 | GO: ${qualifResult.prospect_interessant}`);

  if (!guardQualification(qualifResult)) {
    monitoring.captureLeadProcessed(lead.site_web, 'rejected_qualification', qualifResult.score_global);
    
    const updateData = {
      ...lead,
      status: 'rejected',
      rejection_stage: 'qualification',
      score: qualifResult.score_global,
      business_potential_score: qualifResult.business_potential?.score || 0,
      estimated_deal_value: qualifResult.business_potential?.estimated_deal_value || 0,
      priorite: qualifResult.priorite,
      raison_rejet: qualifResult.raison,
      qualification: qualifResult.scores,
      updated_at: new Date(),
      processed_at: new Date().toISOString()
    };

    if (leadId) {
      await supabaseAdmin.from('leads').update(updateData).eq('id', leadId);
    } else {
      leadId = await saveLead(updateData);
    }
    
    return { leadId, status: 'rejected_qualification', score: qualifResult.score_global, raison_rejet: qualifResult.raison };
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 2 — SCAN COMPLET + LIGHTHOUSE
  // ════════════════════════════════════════════════════════════════
  console.log(`[2/7] Scan complet + Lighthouse...`);
  let scannedData: any;
  let lighthouseData: any;
  try {
    [scannedData, lighthouseData] = await Promise.all([
      scanFullSite(lead.site_web),
      runLighthouse(lead.site_web)
    ]);
  } catch (e) {
    console.error('[2/7] Scan/Lighthouse failed:', e);
    monitoring.captureLeadProcessed(lead.site_web, 'error_scan', qualifResult.score_global);
    return { leadId: leadId || null, status: 'error_scan', raison_rejet: 'Scan or Lighthouse failed' };
  }

  scannedData = {
    ...(scannedData || {}),
    url: lead.site_web,
    h1: scannedData?.h1 || quickData?.h1 || '',
    meta_title: scannedData?.meta_title || quickData?.title || '',
    meta_description: scannedData?.meta_description || quickData?.meta_desc || '',
  };

  if (!lighthouseData) {
    lighthouseData = {
      performanceScore: 0,
      lcp: '0',
      cls: '0',
      ttfb: quickData?.ttfb || 0,
      total_byte_weight: 0,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 3 — ENRICHISSEMENT BUSINESS
  // ════════════════════════════════════════════════════════════════
  console.log(`[3/8] Enrichisseur → business intelligence...`);
  const enrichedData = await runEnrichisseurAgent({
    ...scannedData,
    performance_score: lighthouseData.performanceScore,
    ttfb: lighthouseData.ttfb,
    status: scannedData.status,
    https: scannedData.https
  });

  // ════════════════════════════════════════════════════════════════
  // PHASE 3.5 — DATA REDUCER (INDUSTRIAL LAYER)
  // ════════════════════════════════════════════════════════════════
  console.log(`[3.5/8] DataReducer → compression & signaux...`);
  const reducedInput = await dataReducer(scannedData, lighthouseData, lead.secteur, lead.ville);

  // ════════════════════════════════════════════════════════════════
  // PHASE 4 — AUDIT ULTRA
  // ════════════════════════════════════════════════════════════════
  console.log(`[4/8] Audit Ultra...`);
  const auditData: any = await runUltraAudit(reducedInput);

  if (!guardAudit(auditData)) {
    monitoring.captureLeadProcessed(lead.site_web, 'error_audit', 0);
    return { leadId: leadId || null, status: 'error_audit', raison_rejet: 'Audit returned invalid data' };
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 5 — STRATÈGE
  // ════════════════════════════════════════════════════════════════
  console.log(`[5/8] Stratège → angle d'attaque...`);
  const strategyData = await strategeAgent(
    {
      score_global:        auditData.score_global,
      faiblesses_majeures: auditData.faiblesses_majeures,
      estimation_impact:   auditData.pertes_business, // Align with AuditUltraV4
      verdict_refonte:     auditData.verdict,        // Align with AuditUltraV4
      enriched_data:       enrichedData
    },
    lead.secteur
  );

  // ════════════════════════════════════════════════════════════════
  // PHASE 6 — ARCHITECTE
  // ════════════════════════════════════════════════════════════════
  console.log(`[6/8] Architecte → structure du site...`);
  const archiData = await runArchitecteAgent(
    {
      score_global:        auditData.score_global,
      faiblesses_majeures: auditData.faiblesses_majeures,
      verdict_refonte:     auditData.verdict_refonte,
    },
    lead.secteur,
    lead.ville
  );

  // ════════════════════════════════════════════════════════════════
  // PHASE 6.5 — CLOSER (V5)
  // ════════════════════════════════════════════════════════════════
  console.log(`[6.5/8] Closer → roadmap & offre commerciale...`);
  const closerResult = await runCloserAgent({
    audit: auditData,
    strategy: strategyData,
    archi: archiData,
    secteur: lead.secteur
  });

  // ════════════════════════════════════════════════════════════════
  // PHASE 6.7 — PROPOSAL GENERATOR (V5)
  // ════════════════════════════════════════════════════════════════
  console.log(`[6.7/8] Proposal → rédaction proposition commerciale...`);
  const proposalResult = await runProposalGenerator(auditData, closerResult, lead);

  // ════════════════════════════════════════════════════════════════
  // PHASE 7 — COPYWRITER (PLUME)
  // ════════════════════════════════════════════════════════════════
  console.log(`[7/8] Copywriter → rédaction email...`);
  const emailDestinataire = guardEmail(lead, eclaireurResult);
  
  const parsedEmail = await runCopywriterAgent(strategyData, {
    ...lead,
    audit_data: auditData,
    archi_data: archiData,
    closer_data: closerResult,
    proposal_data: proposalResult,
    enriched_data: enrichedData,
  });

  // ════════════════════════════════════════════════════════════════
  // PHASE 8 — CRITIQUE
  // ════════════════════════════════════════════════════════════════
  console.log(`[8/8] Critique → validation qualité...`);
  const critiqueResult = await critiqueAgent(parsedEmail);

  // ════════════════════════════════════════════════════════════════
  // SAUVEGARDE FINALE — UPDATE SUPABASE
  // ════════════════════════════════════════════════════════════════
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ [Pipeline] SUCCÈS → ${lead.nom} | Score: ${auditData.score_global}/100 | Durée: ${duration}s`);

  const finalUpdate = {
    ...lead,
    status:             'email_ready',
    funnel_stage:       'email_ready',
    email_destinataire: emailDestinataire,
    score:              qualifResult.score_global,
    business_potential_score: qualifResult.business_potential?.score || 0,
    estimated_deal_value: qualifResult.business_potential?.estimated_deal_value || 0,
    priorite:           qualifResult.priorite,
    score_opportunite:  enrichedData.opportunite_score,

    // ✅ CHAMPS PLATS (Dashboard compliance)
    email_objet:      critiqueResult.objet_final || parsedEmail.objet || '',
    email_body:       critiqueResult.corps_final || parsedEmail.corps || '',
    
    // Données riches pour la War Room (Structure Plate)
    qualification:  qualifResult,
    eclaireur:      eclaireurResult,
    audit_data:     auditData,
    strategy:       strategyData,
    archi_data:     archiData,
    closer_output:  closerResult,
    proposal_data:  proposalResult,
    enriched_data:  enrichedData,
    email_final: {
      objet:            critiqueResult.objet_final,
      corps:            critiqueResult.corps_final,
      variante_choisie: critiqueResult.variante_choisie,
      qualite_score:    critiqueResult.qualite_score,
    },

    pipeline_duration_seconds: duration,
    processed_at: new Date().toISOString(),
    updated_at: new Date()
  };

  // 🔥 Nettoyage de la duplication (Dashboard compliance)
  (finalUpdate as any).proposition_data = null;

  if (leadId) {
    const { error: updateError } = await supabaseAdmin.from('leads').update(finalUpdate).eq('id', leadId);
    if (updateError) {
      console.error('[DB] Error updating lead:', updateError);
      throw updateError;
    }
  } else {
    leadId = await saveLead(finalUpdate);
  }

  monitoring.captureLeadProcessed(lead.site_web, 'email_ready', auditData.score_global);

  return {
    leadId,
    status: 'email_ready', // Keep external interface compatible
    score: auditData.score_global,
    email_ready: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE EN BATCH — Traitement de plusieurs leads avec concurrence limitée
// ─────────────────────────────────────────────────────────────────────────────
export async function runBatchPipeline(leads: LeadInput[], concurrency = 3) {
  console.log(`[Batch] ${leads.length} leads — concurrence: ${concurrency}`);
  const results: PipelineResult[] = [];

  // Traitement par chunks pour ne pas exploser les rate limits LLM
  for (let i = 0; i < leads.length; i += concurrency) {
    const chunk = leads.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(lead => runPipeline(lead))
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[Batch] Lead failed:', result.reason);
        results.push({ leadId: null, status: 'error_pipeline' });
      }
    }

    // Pause entre les chunks pour respecter les rate limits
    if (i + concurrency < leads.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Stats batch
  const stats = {
    total:              leads.length,
    email_ready:        results.filter(r => r.status === 'email_ready').length,
    rejected_eclaireur: results.filter(r => r.status === 'rejected_eclaireur').length,
    rejected_qualif:    results.filter(r => r.status === 'rejected_qualification').length,
    rejected_quality:   results.filter(r => r.status === 'rejected_quality').length,
    errors:             results.filter(r => r.status.startsWith('error')).length,
  };
  console.log(`[Batch] DONE →`, stats);

  return { results, stats };
}
