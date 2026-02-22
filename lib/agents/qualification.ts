import { gemini } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// AGENT QUALIFICATION — Phase 1 du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────

const SECTOR_BUSINESS_POTENTIAL: Record<string, {
  solvabilite: number;
  budget_typical: string;
  urgence_digitale: string;
  concurrence_locale: 'forte' | 'moyenne' | 'faible';
}> = {
  restaurant: {
    solvabilite: 18,
    budget_typical: "1 500€ – 3 000€",
    urgence_digitale: "60% des réservations viennent du web. Sans site performant, les tables restent vides.",
    concurrence_locale: 'forte'
  },
  avocat: {
    solvabilite: 23,
    budget_typical: "2 500€ – 5 000€",
    urgence_digitale: "67% des clients cherchent leur avocat sur Google. Crédibilité visuelle = dossiers gagnés.",
    concurrence_locale: 'forte'
  },
  notaire: {
    solvabilite: 22,
    budget_typical: "2 000€ – 4 000€",
    urgence_digitale: "Clientèle vieillissante qui se renouvelle par le digital. Site = premier contact.",
    concurrence_locale: 'moyenne'
  },
  coiffeur: {
    solvabilite: 14,
    budget_typical: "1 200€ – 2 000€",
    urgence_digitale: "Réservation en ligne = agenda plein automatiquement. Concurrents sur Planity/Fresha.",
    concurrence_locale: 'forte'
  },
  artisan: {
    solvabilite: 17,
    budget_typical: "1 500€ – 2 500€",
    urgence_digitale: "Leads en ligne = chantiers réguliers. Fin de la dépendance au bouche-à-oreille.",
    concurrence_locale: 'moyenne'
  },
  plombier: {
    solvabilite: 19,
    budget_typical: "1 500€ – 2 500€",
    urgence_digitale: "Urgences 24h/24 = trafic permanent. Un formulaire de devis = CA la nuit.",
    concurrence_locale: 'forte'
  },
  electricien: {
    solvabilite: 19,
    budget_typical: "1 500€ – 2 500€",
    urgence_digitale: "Urgences et certifications RGE à afficher — site performant = leads qualifiés.",
    concurrence_locale: 'forte'
  },
  medecin: {
    solvabilite: 21,
    budget_typical: "1 800€ – 3 500€",
    urgence_digitale: "Nouveaux patients cherchent sur Google. Intégration Doctolib visible = agenda plein.",
    concurrence_locale: 'moyenne'
  },
  dentiste: {
    solvabilite: 22,
    budget_typical: "2 000€ – 4 000€",
    urgence_digitale: "Secteur très concurrentiel. Design premium = confiance avant le premier RDV.",
    concurrence_locale: 'forte'
  },
  immobilier: {
    solvabilite: 20,
    budget_typical: "2 000€ – 4 000€",
    urgence_digitale: "Dépendance aux portails = marges érodées. Site propre = leads directs sans commission.",
    concurrence_locale: 'forte'
  },
  coach: {
    solvabilite: 16,
    budget_typical: "1 500€ – 3 000€",
    urgence_digitale: "Personal branding = différenciation. Site = vitrine de crédibilité avant le premier appel.",
    concurrence_locale: 'forte'
  },
  comptable: {
    solvabilite: 20,
    budget_typical: "2 000€ – 3 500€",
    urgence_digitale: "Cabinet moderne = clients TPE/PME qui font confiance. SEO local = prospects qualifiés.",
    concurrence_locale: 'moyenne'
  },
  default: {
    solvabilite: 15,
    budget_typical: "1 500€ – 2 500€",
    urgence_digitale: "Présence digitale = crédibilité et génération de leads en continu.",
    concurrence_locale: 'moyenne'
  }
};

function getSectorProfile(sector: string) {
  const key = Object.keys(SECTOR_BUSINESS_POTENTIAL).find(k =>
    sector.toLowerCase().includes(k)
  ) || 'default';
  return { key, ...SECTOR_BUSINESS_POTENTIAL[key] };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING OPPORTUNITÉ
// ── BUG FIX #1 : piliers renommés pour cohérence avec le reste du code ───────
// Anciens noms : technique / conversion / business / credibilite
// Nouveaux noms : transformation / conversion / business / rentabilite
// ─────────────────────────────────────────────────────────────────────────────
export function computeOpportunityScore(data: any, sectorProfile?: ReturnType<typeof getSectorProfile>) {
  let score = 0;
  const details = { transformation: 0, conversion: 0, business: 0, rentabilite: 0 };

  // 1. Transformation / Technique (30 pts)
  if ((data.performance_score || data.score_performance || 100) < 60) { score += 10; details.transformation += 10; }
  if ((data.mobile_score || data.score_mobile || 100) < 60)           { score += 10; details.transformation += 10; }
  if (!data.https)                                                      { score += 10; details.transformation += 10; }

  // 2. Conversion (30 pts)
  if (!data.formulaire_present)                                         { score += 10; details.conversion += 10; }
  if (!data.cta_principal && (data.cta_count || 0) < 2)                { score += 10; details.conversion += 10; }
  if (!data.avis_clients)                                               { score += 10; details.conversion += 10; }

  // 3. Business (20 pts)
  if (data.design_level === "low" || (data.score_global || 0) < 50)    { score += 10; details.business += 10; }
  if (!data.proposition_valeur || data.proposition_valeur.length < 20) { score += 10; details.business += 10; }

  // 4. Rentabilité / Crédibilité (20 pts)
  if (data.coherence_nap === "mauvaise")    { score += 10; details.rentabilite += 10; }
  if (!data.mentions_legales_presentes)     { score += 10; details.rentabilite += 10; }

  // ── OPTIM #1 : Boost solvabilité sectorielle ────────────────────────────
  // Un avocat n'a pas le même potentiel business qu'un coiffeur — le score doit le refléter
  if (sectorProfile) {
    const businessBoost = Math.round(sectorProfile.solvabilite * 0.25);
    score += businessBoost;
    details.business += businessBoost;
  }

  // ── OPTIM #2 : Boost concurrence locale ─────────────────────────────────
  // Concurrence forte = urgence forte = prospect plus motivé
  if (sectorProfile?.concurrence_locale === 'forte') {
    score += 5;
    details.business += 5;
  }

  return { score: Math.min(100, score), details };
}

/**
 * 💎 BUSINESS POTENTIAL SCORE (V5)
 * Calcule la valeur purement commerciale du lead.
 * Différent de l'opportunité (qui mesure la faiblesse technique).
 */
export function computeBusinessPotentialScore(
  sectorProfile: ReturnType<typeof getSectorProfile>,
  quickData: any
) {
  let score = 0;
  const factors = { solvabilite: 0, trafic: 0, concurrence: 0, urgence: 0 };

  // 1. Solvabilité (40 pts) - Le pilier le plus important
  score += sectorProfile.solvabilite; // Max 25 (déjà à 25 pour avocats/notaires)
  factors.solvabilite = sectorProfile.solvabilite;
  
  // Bonus solvabilité top-tier
  if (sectorProfile.solvabilite >= 20) {
    score += 15;
    factors.solvabilite += 15;
  }

  // 2. Trafic estimé / Volume local (30 pts)
  // On utilise les visiteurs estimés si dispo ou on déduit par le secteur
  const visitors = quickData.estimated_monthly_visitors || 1000;
  if (visitors > 2000) { score += 30; factors.trafic = 30; }
  else if (visitors > 1000) { score += 20; factors.trafic = 20; }
  else { score += 10; factors.trafic = 10; }

  // 3. Concurrence locale (20 pts)
  // Plus il y a de concurrence, plus un lead signé a de la valeur (référence)
  if (sectorProfile.concurrence_locale === 'forte') {
    score += 20;
    factors.concurrence = 20;
  } else if (sectorProfile.concurrence_locale === 'moyenne') {
    score += 10;
    factors.concurrence = 10;
  }

  // 4. Signal Urgence Seed (10 pts)
  // Si le site a des défauts critiques ET un gros CA potentiel
  if ((quickData.performance_score || 100) < 40 || !quickData.cta_present) {
    score += 10;
    factors.urgence = 10;
  }

  return { 
    score: Math.min(100, score), 
    factors,
    estimated_deal_value: sectorProfile.solvabilite * 150 // Estimation naïve pour le Dashboard
  };
}

function computeDeterministicScores(quickData: any, sector: string, ville: string, nom: string) {
  const sectorProfile = getSectorProfile(sector);
  const oppScore = computeOpportunityScore(quickData, sectorProfile);
  const bizScore = computeBusinessPotentialScore(sectorProfile, quickData);

  return {
    scores: oppScore.details,
    score_global: oppScore.score,
    business_potential: bizScore,
    sector_profile: sectorProfile
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────
const FEW_SHOT_QUALIFICATION = `
=== EXEMPLE 1 — Restaurant (Score: 78/100) — HAUTE PRIORITÉ ===
Title: "Chez Marcel - Restaurant" | H1: "Bienvenue" | Meta: absente | TTFB: 4200ms
Scores: Business 19 | Transformation 22 | Conversion 20 | Rentabilité 17
Raison: "Restaurant solvable avec site amateur critique (H1 générique, meta absente, TTFB 4.2s). Potentiel de transformation maximal."

=== EXEMPLE 2 — Avocat (Score: 82/100) — HAUTE PRIORITÉ ===
Title: "Cabinet Dupont Avocats Paris" | H1: "Votre défense, notre priorité" | Meta: "Cabinet d'avocats spécialisé..." | TTFB: 1800ms
Scores: Business 23 | Transformation 18 | Conversion 21 | Rentabilité 20
Raison: "Cabinet parisien solvable. Site fonctionnel mais daté. TTFB élevé pénalise le SEO local."

=== EXEMPLE 3 — Coiffeur (Score: 52/100) — PRIORITÉ MOYENNE ===
Title: "Salon Beauté" | H1: "Salon de coiffure" | Meta: "Votre salon..." | TTFB: 890ms
Scores: Business 14 | Transformation 13 | Conversion 14 | Rentabilité 11
Raison: "Coiffeur indépendant, budget limité. Site basique mais pas catastrophique. Potentiel moyen."

=== EXEMPLE 4 — REJET (Score: 28/100) ===
Title: "Agence Digitale | Création Sites Web" | H1: "Votre agence web locale" | Meta: "Création de sites..." | TTFB: 320ms
Scores: Business 10 | Transformation 2 | Conversion 8 | Rentabilité 8
Raison: "REJETÉ — site d'agence web déjà performant. Pas de potentiel de transformation. Non-prospect."
`;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function runQualificationAgent(
  url: string,
  sector: string,
  quickData: any,
  nom?: string,
  ville?: string
) {
  const nomClean   = nom   || url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
  const villeClean = ville || '';

  const { scores, score_global, business_potential, sector_profile } = computeDeterministicScores(
    quickData, sector, villeClean, nomClean
  );

  // ── BUG FIX #1 : scores.transformation existe maintenant ─────────────────
  // ── OPTIM #3 : seuil relevé de < 5 à < 6 — rejet dur mais pas excessif
  if (scores.transformation < 6) {
    console.log(`[Qualification] REJET IMMÉDIAT (transformation: ${scores.transformation}/25) → ${nomClean}`);
    return {
      scores,
      score_global,
      prospect_interessant: false,
      priorite: 'basse' as const,
      probabilite_signature: 'faible' as const,
      raison: `Site déjà trop performant pour une refonte (transformation ${scores.transformation}/25 < 6). Non-cible.`,
      angle_rapide: null,
      sector_context: sector_profile.urgence_digitale,
      budget_estime: sector_profile.budget_typical
    };
  }

  const model = gemini.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
  });

  const prompt = `Tu es un consultant en qualification de prospects pour une agence web.
Tu as déjà calculé les scores ci-dessous. Ta mission : rédiger une raison précise et ajuster si nécessaire.

DONNÉES RÉELLES DU PROSPECT :
- Entreprise : ${nomClean}
- Secteur : ${sector}
- Ville : ${villeClean}
- URL : ${url}
- Title HTML : "${quickData.title || 'ABSENT'}"
- H1 : "${quickData.h1 || 'ABSENT'}"
- Meta description : "${quickData.meta_desc || 'ABSENTE'}"
- TTFB : ${quickData.ttfb || 0}ms
- Niveau de Design estimé : ${quickData.design_level || 'non évalué'}
- CTAs : ${quickData.cta_count || 0} (Principal présent : ${quickData.cta_primary_present ? 'OUI' : 'NON'})

SCORES CALCULÉS :
- Transformation : ${scores.transformation}/25
- Conversion : ${scores.conversion}/25
- Business : ${scores.business}/25
- Rentabilité : ${scores.rentabilite}/25
- Score global : ${score_global}/100

CONTEXTE SECTORIEL :
- Budget typique : ${sector_profile.budget_typical}
- Urgence digitale : ${sector_profile.urgence_digitale}
- Concurrence locale : ${sector_profile.concurrence_locale}
- Solvabilité : ${sector_profile.solvabilite}/25

${FEW_SHOT_QUALIFICATION}

RÈGLES :
- Tu peux ajuster le score_global de -10 à +10 seulement.
- Un H1 générique ("Bienvenue", juste le nom) = signal négatif fort.
- Absence de ville dans les balises = SEO local inexistant = bon prospect.
- Rédige une raison de 2 phrases max, précise, basée sur les données ci-dessus.
- JAMAIS de raison générique.

RÉPONDS UNIQUEMENT EN JSON :
{
  "score_ajuste": <score_global ± 10 max>,
  "priorite": "haute" | "moyenne" | "basse",
  "raison": "<2 phrases précises citant des données réelles>",
  "angle_rapide": "<L'angle de vente en 5 mots max>",
  "probabilite_signature": "faible" | "moyenne" | "forte"
}`;

  let attempts = 0;
  while (attempts < 2) {
    try {
      const result = await model.generateContent(prompt);
      const text   = result.response.text();
      const json   = extractJsonSafe(text);

      if (!json) throw new Error("JSON invalide");

      const scoreFinal = Math.max(
        Math.min(json.score_ajuste || score_global, score_global + 10),
        score_global - 10
      );

      // ── BUG FIX #2 : règle unique et cohérente — plus de conflit 60 vs 40 ──
      const isInteresting  = scoreFinal >= 55 && scores.transformation >= 8;
      const priorite       = scoreFinal >= 75 ? 'haute' :
                             scoreFinal >= 55 ? 'moyenne' : 'basse';

      // Probabilité de signature basée sur solvabilité + score + concurrence
      const probSignature: 'faible' | 'moyenne' | 'forte' =
        json.probabilite_signature ||
        (scoreFinal >= 75 && sector_profile.solvabilite >= 20 ? 'forte' :
         scoreFinal >= 55 ? 'moyenne' : 'faible');

      console.log(`[Qualification] ${nomClean} → ${isInteresting ? '✅' : '❌'} Score: ${scoreFinal}/100 (${priorite}) Signature: ${probSignature}`);

      return {
        scores,
        score_global:           scoreFinal,
        business_potential:     business_potential,
        prospect_interessant:   isInteresting,
        priorite,
        probabilite_signature:  probSignature,
        raison:                 json.raison || `Score ${scoreFinal}/100 — ${sector} ${villeClean}`,
        angle_rapide:           json.angle_rapide || null,
        sector_context:         sector_profile.urgence_digitale,
        budget_estime:          sector_profile.budget_typical
      };

    } catch (e) {
      attempts++;
      console.warn(`[Qualification] Tentative ${attempts}/2 échouée:`, e);

      if (attempts === 2) {
        const isInteresting = score_global >= 55 && scores.transformation >= 8;
        const priorite      = score_global >= 75 ? 'haute' :
                              score_global >= 55 ? 'moyenne' : 'basse';
        const probSignature: 'faible' | 'moyenne' | 'forte' =
          score_global >= 75 && sector_profile.solvabilite >= 20 ? 'forte' :
          score_global >= 55 ? 'moyenne' : 'faible';

        console.warn(`[Qualification] Fallback déterministe → ${isInteresting ? 'GO' : 'SKIP'} (${score_global}/100)`);

        return {
          scores,
          score_global,
          prospect_interessant:  isInteresting,
          priorite,
          probabilite_signature: probSignature,
          raison:                `Qualification automatique (fallback) — Score ${score_global}/100. Transformation: ${scores.transformation}/25.`,
          angle_rapide:          null,
          sector_context:        sector_profile.urgence_digitale,
          budget_estime:         sector_profile.budget_typical
        };
      }
    }
  }

  // Filet de sécurité — ne devrait jamais arriver
  return {
    scores,
    score_global,
    prospect_interessant:  false,
    priorite:              'basse' as const,
    probabilite_signature: 'faible' as const,
    raison:                "Erreur critique — prospect ignoré par sécurité.",
    angle_rapide:          null,
    sector_context:        sector_profile.urgence_digitale,
    budget_estime:         sector_profile.budget_typical
  };
}