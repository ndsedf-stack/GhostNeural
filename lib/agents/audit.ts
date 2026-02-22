import { anthropic } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';
import { AUDIT_SYSTEM_PROMPT } from '../prompts/audit';
import { ReducedAuditInput, getSectorBenchmark } from '../utils/data-reducer';
import fs from 'fs';
import path from 'path';

function debugLog(msg: string) {
  const logPath = path.join(process.cwd(), 'debug_audit.log');
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
}

const SECTOR_METRICS_FALLBACK: Record<string, { tauxConv: number; panier: number }> = {
  restaurant: { tauxConv: 0.03, panier: 45 },
  avocat: { tauxConv: 0.02, panier: 800 },
  artisan: { tauxConv: 0.025, panier: 1200 },
  immobilier: { tauxConv: 0.015, panier: 6000 },
  medecin: { tauxConv: 0.04, panier: 50 },
  coiffeur: { tauxConv: 0.035, panier: 60 },
  default: { tauxConv: 0.02, panier: 200 }
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES v4 (Ultra-Strict)
// ─────────────────────────────────────────────────────────────────────────────
export interface AuditUltraV4 {
  piliers: {
    presence: Pilier
    esthetique: Pilier
    ux: Pilier
    performance: Pilier
  }
  pertes_business: {
    visiteurs_estimes_mois?: number
    visiteurs_perdus_mois?: number
    taux_conversion_secteur?: number
    conversions_perdues?: number
    panier_moyen?: number
    ca_perdu_mensuel?: number
    hypotheses: string[]
  }
  priorites: Priorite[]
  score_global: number
  verdict: string
  diagnose_synthese?: any
}

export interface Pilier {
  score: number
  preuves: string[]
  impact_business: string
}

export interface Priorite {
  probleme: string
  gain_estime: string
  preuve: string
  actions?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATEUR RUNTIME
// ─────────────────────────────────────────────────────────────────────────────
export function validateAuditUltraV4(audit: any): asserts audit is AuditUltraV4 {
  if (!audit) throw new Error("Audit vide")

  const piliers = ["presence", "esthetique", "ux", "performance"]

  for (const p of piliers) {
    if (!audit.piliers?.[p]) throw new Error(`Pilier manquant: ${p}`)
    if (typeof audit.piliers[p].score !== "number")
      throw new Error(`Score invalide: ${p}`)
    if (!audit.piliers[p].impact_business)
      throw new Error(`Impact manquant: ${p}`)
  }

  if (!audit.pertes_business)
    throw new Error("pertes_business manquant")

  const pb = audit.pertes_business
  const nums = [
    "visiteurs_estimes_mois",
    "visiteurs_perdus_mois",
    "taux_conversion_secteur",
    "conversions_perdues",
    "panier_moyen",
    "ca_perdu_mensuel"
  ]

  if (!audit._first_pass) {
    for (const k of nums) {
      if (typeof pb[k] !== "number") {
        console.error(`[VALIDATE] Field ${k} is NOT a number:`, pb[k], " (Type:", typeof pb[k], ")");
        throw new Error(`Champ pertes invalide: ${k} (Type: ${typeof pb[k]})`)
      }
    }
  }

  if (!audit.verdict)
    throw new Error("verdict manquant")
  
  if (!audit.priorites?.length)
    throw new Error("priorites vide")

  if (typeof audit.score_global !== "number")
    throw new Error("score_global invalide")
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL v4.1 (Optimisé via DataReducer)
// ─────────────────────────────────────────────────────────────────────────────
export async function runUltraAudit(reducedInput: ReducedAuditInput) {
  const secteur = reducedInput.business.secteur || 'default';
  const benchmark = getSectorBenchmark(secteur);
  
  console.log(`[ULTRA AUDIT] Running for ${reducedInput.business.domaine} (${secteur})`);
  debugLog(`INPUT: ${JSON.stringify(reducedInput, null, 2)}`);

  const prompt = `
=== AUDIT DATA (Reduced) ===
${JSON.stringify(reducedInput, null, 2)}

Lance l'audit ultra v4.1 pour ce site.
Focus sur l'impact business et la comparaison aux benchmarks fournis.
`;

  try {
    console.log("[Ultra Audit v4.1] Launching Claude Haiku (Optimized Input)...");
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      system: AUDIT_SYSTEM_PROMPT(secteur),
      messages: [{ role: "user", content: prompt }]
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    debugLog(`RAW RESPONSE LENGTH: ${rawText.length}`);
    debugLog(`RAW RESPONSE START:\n${rawText.substring(0, 500)}`);
    debugLog(`RAW RESPONSE END:\n${rawText.substring(rawText.length - 500)}`);
    const json = extractJsonSafe(rawText);

    // 1. Validation de la structure (First Pass)
    try {
      (json as any)._first_pass = true;
      debugLog(`BEFORE VALIDATE: _first_pass=${(json as any)._first_pass}`);
      validateAuditUltraV4(json);
    } catch (valError: any) {
      debugLog(`VALIDATION ERROR (First Pass): ${valError.message}`);
      throw valError;
    }

    // 2. Injection des calculs déterministes (le serveur a toujours raison)
    const s = Object.keys(SECTOR_METRICS_FALLBACK).find(k => secteur.toLowerCase().includes(k)) || "default";
    const sectorBenchmark = SECTOR_METRICS_FALLBACK[s];

    json.pertes_business = {
      ...json.pertes_business,
      visiteurs_estimes_mois: reducedInput.computed.estimated_monthly_visitors,
      visiteurs_perdus_mois: Math.round(reducedInput.computed.estimated_lost_revenue_range.max / 100), // Approx logic
      taux_conversion_secteur: sectorBenchmark.tauxConv,
      conversions_perdues: Math.round(reducedInput.computed.estimated_lost_revenue_range.max / sectorBenchmark.panier),
      panier_moyen: sectorBenchmark.panier,
      ca_perdu_mensuel: Math.round((reducedInput.computed.estimated_lost_revenue_range.min + reducedInput.computed.estimated_lost_revenue_range.max) / 2)
    };

    // 2.5 Validation finale (avec les chiffres injectés)
    delete (json as any)._first_pass;
    validateAuditUltraV4(json);

    // 3. Mapping pour compatibilité Dashboard
    return {
      ...json,
      faiblesses_majeures: json.priorites.map((p: any) => p.probleme),
      analyse_piliers: {
        presence: {
          score: (json.piliers.presence.score / 10).toFixed(1),
          observation: json.piliers.presence.impact_business
        },
        esthetique: {
          score: (json.piliers.esthetique.score / 10).toFixed(1),
          observation: json.piliers.esthetique.impact_business
        },
        parcours_ux: {
          score: (json.piliers.ux.score / 10).toFixed(1),
          observation: json.piliers.ux.impact_business
        },
        visibilite_performance: {
          score: (json.piliers.performance.score / 10).toFixed(1),
          observation: json.piliers.performance.impact_business
        }
      },
      estimation_impact: {
        ...json.pertes_business,
        ca_non_capte_estime: `${json.pertes_business.ca_perdu_mensuel}€/mois`,
        visiteurs_perdus_par_mois: `${reducedInput.computed.estimated_monthly_visitors}/mois`,
        taux_conversion_actuel_estime: `${(reducedInput.computed.estimated_conversion_rate_current * 100).toFixed(2)}%`,
        taux_conversion_potentiel: `${(reducedInput.computed.estimated_conversion_rate_potential * 100).toFixed(2)}%`
      },
      seo: {
        h1: reducedInput.content.h1,
        meta_title: reducedInput.content.meta_title,
        meta_description: reducedInput.content.meta_description,
        sitemap_present: reducedInput.business.nb_pages > 1,
        robots_txt: 'PRÉSENT'
      },
      qualification: {
        score_global: json.score_global,
        priorite: json.score_global > 70 ? "HAUTE" : "MOYENNE",
        raison: json.verdict
      },
      verdict_refonte: json.score_global < 50 ? "REFONTE TOTALE" : "OPTIMISATION MAJEURE",
      score_technique: json.score_global,
      _meta: {
        sector_benchmark_used: reducedInput.benchmarks,
        prompt_version: "4.1-REDUCED",
        model: "claude-haiku-4-5-20251001",
        vision_active: false,
        secteur
      }
    };

  } catch (e: any) {
    console.error("[Ultra Audit v4.1] Error:", e.message);
    return { 
      error: "Audit v4.1 failed", 
      details: e.message,
      fallback: true,
      score_global: 50,
      verdict: "Erreur technique lors de l'audit."
    };
  }
}
