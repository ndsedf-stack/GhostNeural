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
import { scanFullSite, scanQuick } from '@/lib/tools/pageScanner';
import { runUltraAudit }         from '@/lib/agents/audit';
import { runLighthouse }         from '@/lib/tools/lighthouseRunner';
import { strategeAgent }         from '@/lib/agents/stratege';
import { runArchitecteAgent }    from '@/lib/agents/architecte';
import { runCopywriterAgent }    from '@/lib/agents/copywriter';
import { critiqueAgent }         from '@/lib/agents/critique';
import { supabaseAdmin }         from '@/lib/supabase/admin';
import { monitoring }            from '@/lib/monitoring';

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
    && result?.score_global >= 50
    && result?.scores?.transformation >= 5; // Critère éliminatoire inviolable
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
  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .insert([data])
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
export async function runPipeline(lead: LeadInput): Promise<PipelineResult> {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[Pipeline] START → ${lead.nom} | ${lead.site_web}`);
  console.log(`${'─'.repeat(60)}`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 0 — ÉCLAIREUR (scanQuick déjà effectué en amont)
  // Input  : quickData (title, h1, meta, ttfb, status) + nom + secteur + ville
  // Output : { go, score_eclaireur, priorite, red_flags, green_flags, email_detecte }
  // Guard  : go === true && score >= 35
  // ════════════════════════════════════════════════════════════════
  console.log(`[0/7] Éclaireur → scan rapide...`);
  let quickData: any;
  try {
    quickData = await scanQuick(lead.site_web);
  } catch (e) {
    console.error('[0/7] scanQuick failed:', e);
    monitoring.captureLeadProcessed(lead.site_web, 'error_pipeline', 0);
    return { leadId: null, status: 'error_pipeline', raison_rejet: 'scanQuick failed' };
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
    // Sauvegarde en base pour analytics (on veut savoir ce qu'on rejette)
    const leadId = await saveLead({
      ...lead,
      status: 'rejected',
      rejection_stage: 'eclaireur',
      score: eclaireurResult.score_eclaireur,
      raison_rejet: eclaireurResult.raison_rejet,
      red_flags: eclaireurResult.red_flags,
    });
    return { leadId, status: 'rejected_eclaireur', score: eclaireurResult.score_eclaireur, raison_rejet: eclaireurResult.raison_rejet };
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 1 — QUALIFICATION
  // Input  : url + secteur + quickData (déjà disponible) + nom + ville
  // Output : { scores{4 piliers}, score_global, prospect_interessant, priorite, raison, angle_rapide, budget_estime }
  // Guard  : prospect_interessant === true && score_global >= 50 && transformation >= 8
  // ════════════════════════════════════════════════════════════════
  console.log(`[1/7] Qualification → scoring 4 piliers...`);
  const qualifResult = await runQualificationAgent(
    lead.site_web,
    lead.secteur,
    quickData,        // ← données réelles, pas l'URL
    lead.nom,
    lead.ville
  );
  console.log(`[1/7] Qualification → score: ${qualifResult.score_global}/100 | GO: ${qualifResult.prospect_interessant}`);

  if (!guardQualification(qualifResult)) {
    monitoring.captureLeadProcessed(lead.site_web, 'rejected_qualification', qualifResult.score_global);
    const leadId = await saveLead({
      ...lead,
      status: 'rejected',
      rejection_stage: 'qualification',
      score: qualifResult.score_global,
      raison_rejet: qualifResult.raison,
      qualification: qualifResult.scores,
    });
    return { leadId, status: 'rejected_qualification', score: qualifResult.score_global, raison_rejet: qualifResult.raison };
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 2 — SCAN COMPLET + LIGHTHOUSE
  // Input  : url
  // Output : scannedData (design_tokens, inner_links, body_text, image_count, form_count, cta_count...)
  //        + lighthouseData (performanceScore, lcp, cls, ttfb, total_byte_weight)
  // Guard  : pas d'erreur critique
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
    return { leadId: null, status: 'error_scan', raison_rejet: 'Scan or Lighthouse failed' };
  }

  // Enrichit scannedData avec les données de quickData déjà disponibles
  scannedData = {
    ...(scannedData || {}),
    url: lead.site_web,
    h1: scannedData?.h1 || quickData?.h1 || '',
    meta_title: scannedData?.meta_title || quickData?.title || '',
    meta_description: scannedData?.meta_description || quickData?.meta_desc || '',
  };

  // Sécurité : si lighthouseData est null, créer un objet minimal
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
  // PHASE 3 — AUDIT ULTRA
  // Input  : scannedData (complet) + lighthouseData + secteur
  // Output : { analyse_piliers{4}, core_web_vitals, seo, sitemap_cible,
  //            verdict_strategique, opportunite_majeure, score_global,
  //            estimation_impact, screenshot_url, design_tokens }
  // Guard  : pas d'error + score_global présent + analyse_piliers présent
  // ════════════════════════════════════════════════════════════════
  console.log(`[3/7] Audit Ultra...`);
  const auditData = await runUltraAudit(scannedData, lighthouseData, lead.secteur);

  // DEBUG: Log complet de l'audit pour identifier le problème
  console.log('[3/7] Audit result:', JSON.stringify(auditData, null, 2));
  console.log('[3/7] Guard checks:', {
    hasError: !!auditData?.error,
    hasScoreGlobal: typeof auditData?.score_global === 'number',
    hasAnalysePiliers: auditData?.analyse_piliers !== undefined,
    scoreValue: auditData?.score_global,
    piliersKeys: auditData?.analyse_piliers ? Object.keys(auditData.analyse_piliers) : 'undefined'
  });

  if (!guardAudit(auditData)) {
    console.error('[3/7] Audit failed or incomplete');
    console.error('[3/7] Audit data received:', auditData);
    monitoring.captureLeadProcessed(lead.site_web, 'error_audit', 0);
    return { leadId: null, status: 'error_audit', raison_rejet: 'Audit returned invalid data' };
  }
  console.log(`[3/7] Audit → score: ${auditData.score_global}/100 | Verdict: ${auditData.verdict_refonte}`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 4 — STRATÈGE
  // Input  : auditData (piliers + score + estimation_impact) + secteur
  //          ⚠️ Ne PAS passer tout l'audit — seulement ce dont il a besoin
  // Output : { angle_approche, point_friction_majeur, solution_strategique,
  //            ton_recommande, buyer_persona, timing_ideal, preuve_sociale, budget_roi }
  // Guard  : aucun rejet possible ici — on continue même si output dégradé
  // ════════════════════════════════════════════════════════════════
  console.log(`[4/7] Stratège → angle d'attaque...`);
  const strategyData = await strategeAgent(
    {
      // On passe uniquement les données utiles au Stratège
      score_global:      auditData.score_global,
      analyse_piliers:   auditData.analyse_piliers,
      core_web_vitals:   auditData.core_web_vitals,
      estimation_impact: auditData.estimation_impact,
      verdict_refonte:   auditData.verdict_refonte,
      opportunite_majeure: auditData.opportunite_majeure,
    },
    lead.secteur
  );
  console.log(`[4/7] Stratège → angle: "${strategyData.angle_approche}" | ton: ${strategyData.ton_recommande}`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 5 — ARCHITECTE
  // Input  : auditData (piliers + sitemap_cible + score) + secteur + ville
  // Output : { arborescence, wireframe, sections_cles, proposition_valeur,
  //            cta, style_visuel, conversion_funnel, fonctionnalites }
  // Guard  : aucun rejet — fallback sectoriel si erreur
  // ════════════════════════════════════════════════════════════════
  console.log(`[5/7] Architecte → structure du site...`);
  const archiData = await runArchitecteAgent(
    {
      score_global:        auditData.score_global,
      analyse_piliers:     auditData.analyse_piliers,
      sitemap_cible:       auditData.sitemap_cible,
      sitemap_actuel:      auditData.sitemap_actuel,
      verdict_refonte:     auditData.verdict_refonte,
      opportunite_majeure: auditData.opportunite_majeure,
    },
    lead.secteur,
    lead.ville
  );
  console.log(`[5/7] Architecte → ${archiData.arborescence?.length || 0} pages | CTA: "${archiData.cta}"`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 6 — COPYWRITER
  // Input  : strategyData (complet) + leadInfo enrichi (avec audit + archi)
  // Output : { objet, corps, variante_a, variante_b, variante_c, recommandation }
  // Guard  : email destinataire trouvé
  // ════════════════════════════════════════════════════════════════
  console.log(`[6/7] Copywriter → rédaction email...`);

  // Vérification email destinataire AVANT de dépenser des tokens
  const emailDestinataire = guardEmail(lead, eclaireurResult);
  if (!emailDestinataire) {
    monitoring.captureLeadProcessed(lead.site_web, 'rejected_no_email', auditData.score_global);
    const leadId = await saveLead({
      ...lead,
      status: 'no_email',
      score: auditData.score_global,
      audit_data: auditData,
      strategy: strategyData,
      archi_data: archiData,
    });
    return { leadId, status: 'rejected_no_email', score: auditData.score_global, raison_rejet: 'Aucun email destinataire trouvé' };
  }

  const emailRaw = await runCopywriterAgent(
    strategyData,
    {
      nom:        lead.nom,
      site_web:   lead.site_web,
      secteur:    lead.secteur,
      ville:      lead.ville,
      // Données chainées depuis les agents précédents
      audit_data: auditData,
      archi_data: archiData,
    }
  );
  console.log(`[6/7] Copywriter → objet: "${emailRaw.objet?.slice(0, 60)}..."`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 7 — CRITIQUE (validation finale)
  // Input  : output complet du Copywriter (3 variantes)
  // Output : { objet_final, corps_final, qualite_score, envoyable, variante_choisie, blocages }
  // Guard  : envoyable === true && qualite_score >= 60
  // ════════════════════════════════════════════════════════════════
  console.log(`[7/7] Critique → validation qualité...`);
  const critiqueResult = await critiqueAgent(emailRaw);
  console.log(`[7/7] Critique → score: ${critiqueResult.qualite_score}/100 | Envoyable: ${critiqueResult.envoyable}`);

  if (!guardCritique(critiqueResult)) {
    monitoring.captureLeadProcessed(lead.site_web, 'rejected_quality', auditData.score_global);
    // Sauvegarde quand même — l'humain peut corriger manuellement depuis la War Room
    const leadId = await saveLead({
      ...lead,
      status: 'quality_review',
      email_destinataire: emailDestinataire,
      score: auditData.score_global,
      audit_data:   auditData,
      strategy:     strategyData,
      archi_data:   archiData,
      email_draft:  { ...emailRaw, critique: critiqueResult },
      qualification: qualifResult,
    });
    return {
      leadId,
      status: 'rejected_quality',
      score: auditData.score_global,
      raison_rejet: `Score qualité email insuffisant (${critiqueResult.qualite_score}/100): ${critiqueResult.blocages?.join(', ')}`
    };
  }

  // ════════════════════════════════════════════════════════════════
  // SAUVEGARDE FINALE — Lead EMAIL_READY
  // ════════════════════════════════════════════════════════════════
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ [Pipeline] SUCCÈS → ${lead.nom} | Score: ${auditData.score_global}/100 | Durée: ${duration}s`);

  const leadId = await saveLead({
    ...lead,
    status:             'email_ready',
    email_destinataire: emailDestinataire,
    score:              auditData.score_global,
    priorite:           qualifResult.priorite,

    // Données complètes pour la War Room
    qualification:  qualifResult,
    eclaireur:      eclaireurResult,
    audit_data:     auditData,
    strategy:       strategyData,
    archi_data:     archiData,
    email_final: {
      objet:            critiqueResult.objet_final,
      corps:            critiqueResult.corps_final,
      variante_choisie: critiqueResult.variante_choisie,
      qualite_score:    critiqueResult.qualite_score,
      variante_a:       emailRaw.variante_a,
      variante_b:       emailRaw.variante_b,
      variante_c:       emailRaw.variante_c,
    },

    // Métadonnées
    pipeline_duration_seconds: duration,
    processed_at: new Date().toISOString(),
  });

  monitoring.captureLeadProcessed(lead.site_web, 'success', auditData.score_global);

  return {
    leadId,
    status: 'email_ready',
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
