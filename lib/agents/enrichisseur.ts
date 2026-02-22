import { anthropic, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';
import { ENRICH_SYSTEM_PROMPT, ENRICH_USER_PROMPT_TEMPLATE } from '../prompts/enrichissement';

// ─────────────────────────────────────────────────────────────────────────────
// ENRICHISSEUR — Phase 2 du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Intelligence business qualitative — PAS un rescoring technique
// Input : scannedData (résultat Playwright/scan rapide)
// Output : positionnement, frictions, impact_business, maturite_digitale
//
// RÈGLE ARCHITECTURALE :
// Qualification = scoring primaire (score /100)
// Enrichisseur = insights uniquement (frictions, ROI, positionnement)
// Stratège = angle commercial (utilise les deux)
// ─────────────────────────────────────────────────────────────────────────────

export async function runEnrichisseurAgent(scannedData: any) {
  try {
    const prompt = ENRICH_USER_PROMPT_TEMPLATE(scannedData);

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        temperature: 0, // Précision maximale — zéro invention
        system: ENRICH_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Échec Enrichisseur — réponse vide");

    // ── BUG FIX #1 : parsing JSON robuste — result est une string ────────────
    const cleaned = typeof result === 'string'
      ? result.replace(/```json|```/g, '').trim()
      : JSON.stringify(result);

    let json: any;
    try {
      json = extractJsonSafe(cleaned) || JSON.parse(cleaned);
    } catch {
      json = {};
    }

    // ── BUG FIX #2 : finalScore utilisé et réinjecté dans json ───────────────
    // opportunite_score = indicateur qualitatif de l'Enrichisseur
    // NE PAS confondre avec le score_global de Qualification
    const finalScore = Math.min(100, Math.max(0, json.opportunite_score || 50));
    json.opportunite_score = finalScore;

    // ── BUG FIX #3 : normalisation technique réinjectée dans json ────────────
    json.technique = {
      ...json.technique,
      http_status: scannedData.status,
      https:       scannedData.https,
    };

    // ── OPTIM : impact_business structuré pour alimenter Stratège + Copywriter
    // Si l'Enrichisseur ne l'a pas sorti, on construit un fallback structuré
    if (!json.impact_business) {
      json.impact_business = {
        leads_perdus_estime:  json.conversion?.cta_principal ? null : "Non évalué",
        ca_non_capte_estime:  null,
        niveau_urgence:       finalScore >= 70 ? "élevé" : finalScore >= 50 ? "modéré" : "faible",
      };
    }

    // ── OPTIM : maturite_digitale si absente ─────────────────────────────────
    if (!json.maturite_digitale) {
      json.maturite_digitale =
        finalScore >= 70 ? "faible à moyenne" :
        finalScore >= 45 ? "moyenne" : "bonne";
    }

    // ── OPTIM : pression_concurrentielle si absente ───────────────────────────
    if (!json.pression_concurrentielle) {
      json.pression_concurrentielle =
        scannedData.sector_competition ||
        (json.business?.positionnement_prix === "premium" ? "forte" : "moyenne");
    }

    return {
      ...json,
      _meta: {
        agent:   "Enrichisseur v2",
        model:   "Claude Haiku 4.5",
        version: "10M-ARR"
      }
    };

  } catch (error) {
    console.error("⚠️ Erreur Enrichisseur:", error);

    // Fallback structuré — tous les champs attendus par Stratège + Copywriter
    return {
      technique: {
        http_status: scannedData.status,
        https:       scannedData.https,
        cms_detecte: scannedData.cms_detecte,
      },
      business: {
        secteur_reel:       null,
        positionnement_prix: null,
        proposition_valeur:  null,
      },
      conversion: {
        formulaire_present: null,
        cta_principal:      null,
        avis_clients:       null,
      },
      credibilite: {
        coherence_nap:              null,
        mentions_legales_presentes: null,
      },
      impact_business: {
        leads_perdus_estime: "Non évalué",
        ca_non_capte_estime: null,
        niveau_urgence:      "modéré",
      },
      opportunite_score:        50,
      maturite_digitale:        "moyenne",
      pression_concurrentielle: "moyenne",
      friction_detectee:        ["Erreur d'enrichissement IA — données partielles"],
      _meta: {
        agent:   "Enrichisseur v2",
        model:   "Claude Haiku 4.5",
        version: "10M-ARR",
        fallback: true,
      }
    };
  }
}