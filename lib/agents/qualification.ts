import { gemini } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// AGENT QUALIFICATION — Phase 1 du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Scoring business approfondi sur 4 piliers (0–25 chacun = 100 max)
// Il tourne APRÈS L'Éclaireur (go = true) et AVANT le scan Playwright complet
// Données : scanQuick() — title, H1, meta, TTFB, url, nom, secteur, ville
//
// RÈGLE FONDAMENTALE : Gemini ne visite PAS l'URL.
// Toutes les données sont injectées dans le prompt — jamais d'invention.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RÉFÉRENTIEL SECTORIEL — Solvabilité et budget moyen par secteur
// ─────────────────────────────────────────────────────────────────────────────
const SECTOR_BUSINESS_POTENTIAL: Record<string, {
  solvabilite: number;      // 0–25 — capacité financière du secteur
  budget_typical: string;   // Fourchette réaliste pour une refonte
  urgence_digitale: string; // Pourquoi ce secteur a besoin du digital maintenant
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
    urgence_digitale: "Même logique que plombier — urgences et certifications RGE à afficher.",
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
// SCORING DÉTERMINISTE DES 4 PILIERS
// Calculé sur les données réelles avant d'appeler Gemini
// ─────────────────────────────────────────────────────────────────────────────
function computeDeterministicScores(
  quickData: any,
  sector: string,
  ville: string,
  nom: string
) {
  const sectorProfile = getSectorProfile(sector);
  const title = (quickData.title || '').toLowerCase();
  const h1 = (quickData.h1 || '').toLowerCase();
  const meta = (quickData.meta_desc || '').toLowerCase();
  const fullText = `${title} ${h1} ${meta}`;

  // ── PILIER 1 : POTENTIEL BUSINESS (0–25) ──
  // Basé sur : solvabilité du secteur + signaux de business réel
  let businessScore = sectorProfile.solvabilite; // Base sectorielle

  // Bonus si ville premium (grande ville = plus de budget)
  const premiumCities = ['paris', 'lyon', 'marseille', 'bordeaux', 'nice', 'toulouse', 'nantes', 'strasbourg', 'lille', 'montpellier', 'cannes', 'monaco', 'saint-tropez'];
  if (ville && premiumCities.some(c => ville.toLowerCase().includes(c))) {
    businessScore = Math.min(25, businessScore + 3);
  }

  // Malus si signaux de petit business (association, bénévolat, etc.)
  const smallSignals = ['association', 'bénévole', 'amateur', 'gratuit', 'école', 'lycée', 'collège'];
  if (smallSignals.some(s => fullText.includes(s))) {
    businessScore = Math.max(5, businessScore - 8);
  }

  businessScore = Math.min(25, Math.max(0, businessScore));

  // ── PILIER 2 : POTENTIEL DE TRANSFORMATION (0–25) ──
  // HAUT = site mauvais → grosse marge de progression
  // BAS = site déjà bon → pas la peine de proposer une refonte
  let transformationScore = 12; // Base neutre

  // Signaux d'un site MAUVAIS (augmentent le score de transformation)
  if (!quickData.h1 || quickData.h1.trim().length < 3) transformationScore += 5;
  if (!quickData.meta_desc || quickData.meta_desc.trim().length < 20) transformationScore += 4;
  if (quickData.ttfb > 3000) transformationScore += 4;
  if (quickData.ttfb > 5000) transformationScore += 3;
  if (title.includes('bienvenue') || title.includes('accueil') || title.includes('home')) transformationScore += 3;
  if (h1.includes('bienvenue') || h1 === nom.toLowerCase()) transformationScore += 3;
  if (!ville || !fullText.includes(ville.toLowerCase())) transformationScore += 2;

  // Signaux d'un site DÉJÀ BON (baissent le score → prospect moins intéressant)
  // On réduit la pénalité car un site peut être rapide mais avoir un design "pourri" (ex: rdvgurume.com)
  if (quickData.ttfb < 500 && quickData.h1?.length > 20 && quickData.meta_desc?.length > 80) transformationScore -= 3;
  if (meta.includes('agence web') || meta.includes('développeur') || title.includes('agence')) transformationScore -= 15;

  transformationScore = Math.min(25, Math.max(0, transformationScore));

  // ── PILIER 3 : POTENTIEL DE CONVERSION (0–25) ──
  // Peut-on augmenter leurs ventes avec un meilleur site ?
  let conversionScore = 12; // Base neutre

  // Secteur avec fort potentiel de conversion web
  const highConversionSectors = ['restaurant', 'coiffeur', 'plombier', 'electricien', 'artisan', 'immobilier'];
  if (highConversionSectors.some(s => sector.toLowerCase().includes(s))) {
    conversionScore += 5;
  }

  // Signaux de perte de conversion
  if (!quickData.h1 || quickData.h1.length < 5) conversionScore += 4; // Pas de message = perte
  if (quickData.ttfb > 2000) conversionScore += 3; // Lent = rebond
  if (!quickData.meta_desc) conversionScore += 2; // Invisible Google = pas de trafic
  if (sectorProfile.concurrence_locale === 'forte') conversionScore += 2; // Concurrence = urgence

  conversionScore = Math.min(25, Math.max(0, conversionScore));

  // ── PILIER 4 : RENTABILITÉ POUR L'AGENCE (0–25) ──
  // Le projet va-t-il être rentable entre 1k–3k€ ?
  let rentabiliteScore = 12; // Base neutre

  // Secteur avec budget connu
  if (sectorProfile.solvabilite >= 20) rentabiliteScore += 5;
  else if (sectorProfile.solvabilite >= 17) rentabiliteScore += 3;
  else if (sectorProfile.solvabilite < 13) rentabiliteScore -= 5;

  // Ville premium = budget plus élevé
  if (ville && premiumCities.some(c => ville.toLowerCase().includes(c))) rentabiliteScore += 3;

  // Site trop simple = projet trop petit
  if (!quickData.h1 && !quickData.meta_desc && quickData.ttfb > 6000) rentabiliteScore -= 5;

  rentabiliteScore = Math.min(25, Math.max(0, rentabiliteScore));

  const scoreGlobal = businessScore + transformationScore + conversionScore + rentabiliteScore;

  return {
    scores: { business: businessScore, transformation: transformationScore, conversion: conversionScore, rentabilite: rentabiliteScore },
    score_global: scoreGlobal,
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
Raison: "Restaurant solvable avec site amateur critique (H1 générique, meta absente, TTFB 4.2s). Potentiel de transformation maximal. Budget 2k€ réaliste."

=== EXEMPLE 2 — Avocat (Score: 82/100) — HAUTE PRIORITÉ ===
Title: "Cabinet Dupont Avocats Paris" | H1: "Votre défense, notre priorité" | Meta: "Cabinet d'avocats spécialisé..." | TTFB: 1800ms
Scores: Business 23 | Transformation 18 | Conversion 21 | Rentabilité 20
Raison: "Cabinet parisien solvable. Site fonctionnel mais daté visuellement. Meta présente mais TTFB élevé. Budget 3k€ accessible."

=== EXEMPLE 3 — Coiffeur (Score: 52/100) — PRIORITÉ MOYENNE ===
Title: "Salon Beauté" | H1: "Salon de coiffure" | Meta: "Votre salon..." | TTFB: 890ms
Scores: Business 14 | Transformation 13 | Conversion 14 | Rentabilité 11
Raison: "Coiffeur indépendant, budget limité (1.2k€ max). Site basique mais pas catastrophique. Potentiel de transformation moyen."

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
  const nomClean = nom || url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
  const villeClean = ville || '';

  // ── ÉTAPE 1 : Scores déterministes (zéro LLM) ──
  const { scores, score_global, sector_profile } = computeDeterministicScores(
    quickData, sector, villeClean, nomClean
  );

  // Critère éliminatoire immédiat : transformation trop basse = site déjà bon
  if (scores.transformation < 5) {
    console.log(`[Qualification] REJET IMMÉDIAT (transformation: ${scores.transformation}/25) → ${nomClean}`);
    return {
      scores,
      score_global,
      prospect_interessant: false,
      priorite: 'basse' as const,
      raison: `Site déjà trop performant pour une refonte (transformation ${scores.transformation}/25 < 5). Non-cible.`,
      sector_context: sector_profile.urgence_digitale,
      budget_estime: sector_profile.budget_typical
    };
  }

  // ── ÉTAPE 2 : Gemini affine la raison et détecte des nuances ──
  // Il reçoit les données réelles + les scores déjà calculés
  // Sa seule mission : rédiger une raison précise et ajuster ±5 points max
  const model = gemini.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
  });

  const prompt = `Tu es un consultant en qualification de prospects pour une agence web.
Tu as déjà calculé les scores ci-dessous. Ta mission : rédiger une raison précise et ajuster si nécessaire.

DONNÉES RÉELLES DU PROSPECT (extraites automatiquement) :
- Entreprise : ${nomClean}
- Secteur : ${sector}
- Ville : ${villeClean}
- URL : ${url}
- Title HTML : "${quickData.title || 'ABSENT'}"
- H1 : "${quickData.h1 || 'ABSENT'}"
- Meta description : "${quickData.meta_desc || 'ABSENTE'}"
- TTFB : ${quickData.ttfb || 0}ms

SCORES CALCULÉS :
- Business : ${scores.business}/25
- Transformation : ${scores.transformation}/25
- Conversion : ${scores.conversion}/25
- Rentabilité : ${scores.rentabilite}/25
- Score global : ${score_global}/100

CONTEXTE SECTORIEL :
- Budget typique : ${sector_profile.budget_typical}
- Urgence digitale : ${sector_profile.urgence_digitale}
- Concurrence locale : ${sector_profile.concurrence_locale}

${FEW_SHOT_QUALIFICATION}

RÈGLES DE JUGEMENT :
- Tu peux ajuster le score_global de -10 à +10 seulement (pas plus).
- Critère éliminatoire ABSOLU : si transformation < 5, prospect_interessant = false sans exception.
- Score > 60 = prospect_interessant : true
- ATTENTION : Un site qui a un H1 et une Meta peut quand même être un EXCELLENT prospect si :
  1. Le contenu est pauvre (ex: H1 = "Bienvenue" ou juste le nom du resto).
  2. Le SEO local n'est pas travaillé (pas de ville dans les balises).
  3. L'expérience est punitive (ex: forcer l'install d'une App, menu en PDF/Image).
  4. Le design semble daté (Wix/constructeur générique).
- Rédige une raison de 2 phrases max, précise, basée sur les données réelles ci-dessus.
- JAMAIS de raison générique. Cite le manque de SEO local ou la pauvreté du H1 si applicable.

RÉPONDS UNIQUEMENT EN JSON :
{
  "score_ajuste": <score_global ± 10 max>,
  "priorite": "haute" | "moyenne" | "basse",
  "prospect_interessant": true | false,
  "raison": "<2 phrases précises citant des données réelles>",
  "angle_rapide": "<L'angle de vente en 5 mots max — sera utilisé par le Stratège>"
}`;

  let attempts = 0;
  while (attempts < 2) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const json = extractJsonSafe(text);

      if (!json) throw new Error("JSON invalide");

      // Sécurité : on ne laisse pas Gemini inverser un rejet déterministe
      const scoreFinal = Math.max(
        Math.min(json.score_ajuste || score_global, score_global + 10),
        score_global - 10
      );

      // Critère éliminatoire inviolable
      const isInteresting = json.prospect_interessant
        && scores.transformation >= 5
        && scoreFinal >= 50;

      const priorite = scoreFinal >= 75 ? 'haute' :
                       scoreFinal >= 55 ? 'moyenne' : 'basse';

      console.log(`[Qualification] ${nomClean} → ${isInteresting ? '✅' : '❌'} Score: ${scoreFinal}/100 (${priorite})`);

      return {
        scores,
        score_global: scoreFinal,
        prospect_interessant: isInteresting,
        priorite,
        raison: json.raison || `Score ${scoreFinal}/100 — ${sector} ${villeClean}`,
        angle_rapide: json.angle_rapide || null,
        sector_context: sector_profile.urgence_digitale,
        budget_estime: sector_profile.budget_typical
      };

    } catch (e) {
      attempts++;
      console.warn(`[Qualification] Tentative ${attempts}/2 échouée:`, e);

      if (attempts === 2) {
        // Fallback sur les scores déterministes uniquement — pas de faux positifs
        const isInteresting = score_global >= 55 && scores.transformation >= 5;
        const priorite = score_global >= 75 ? 'haute' :
                         score_global >= 55 ? 'moyenne' : 'basse';

        console.warn(`[Qualification] Fallback déterministe → ${isInteresting ? 'GO' : 'SKIP'} (${score_global}/100)`);

        return {
          scores,
          score_global,
          prospect_interessant: isInteresting,
          priorite,
          raison: `Qualification automatique (fallback) — Score ${score_global}/100. Transformation: ${scores.transformation}/25.`,
          angle_rapide: null,
          sector_context: sector_profile.urgence_digitale,
          budget_estime: sector_profile.budget_typical
        };
      }
    }
  }

  // Ne devrait jamais arriver — filet de sécurité
  return {
    scores,
    score_global,
    prospect_interessant: false,
    priorite: 'basse' as const,
    raison: "Erreur critique — prospect ignoré par sécurité.",
    angle_rapide: null,
    sector_context: sector_profile.urgence_digitale,
    budget_estime: sector_profile.budget_typical
  };
}
