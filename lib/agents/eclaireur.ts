import { gemini, callLLMWithRetry } from '../llm-clients';

// ─────────────────────────────────────────────────────────────────────────────
// L'ÉCLAIREUR — Phase 0 du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Décision GO / NO-GO AVANT de lancer Playwright complet + Lighthouse
// Coût : ~$0.00001 (Gemini Flash, ~200 tokens input/output)
// Temps : < 2 secondes
// Données : Uniquement ce que scanQuick() retourne — pas d'invention possible
//
// RÈGLE FONDAMENTALE : Gemini ne visite PAS l'URL.
// Il reçoit des données déjà extraites et les interprète.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CRITÈRES DE REJET AUTOMATIQUE (règles déterministes, sans LLM)
// Ces cas sont rejetés immédiatement, avant même d'appeler Gemini
// ─────────────────────────────────────────────────────────────────────────────
const AUTO_REJECT_RULES = {
  // Site inaccessible
  site_down: (data: QuickScanData) => !data.status || data.status >= 400,

  // TTFB catastrophique = serveur mort ou site abandonné
  ttfb_dead: (data: QuickScanData) => data.ttfb > 8000,

  // Pas de titre = site squelette ou page d'erreur
  no_title: (data: QuickScanData) => !data.title || data.title.trim().length < 3,

  // Titre qui trahit un site non-prospect (plateformes, grandes marques)
  big_brand: (data: QuickScanData) => {
    const title = (data.title || '').toLowerCase();
    const excluded = [
      'facebook', 'instagram', 'linkedin', 'twitter', 'youtube',
      'amazon', 'google', 'apple', 'microsoft', 'wordpress.com',
      'wix.com', 'shopify', 'squarespace', 'over-blog', 'blogspot',
      'mairie', 'prefecture', 'gouvernement', 'ministere', '.gouv.fr'
    ];
    return excluded.some(brand => title.includes(brand) || (data.url || '').includes(brand));
  },

  // Site déjà manifestement premium — pas besoin de refonte
  already_premium: (data: QuickScanData) => {
    const title = (data.title || '').toLowerCase();
    const premiumSignals = ['agence web', 'développeur', 'designer', 'studio créatif', 'digital agency'];
    return premiumSignals.some(s => title.includes(s));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAUX DE SCORING (pré-calculés avant Gemini)
// Gemini affine — la logique déterministe décide
// ─────────────────────────────────────────────────────────────────────────────
function computeQuickSignals(data: QuickScanData, secteur: string, ville: string) {
  const signals: string[] = [];
  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  let baseScore = 50; // Score de départ neutre

  // ── TTFB ──
  if (data.ttfb < 300) {
    greenFlags.push(`TTFB rapide (${data.ttfb}ms) — serveur réactif`);
    baseScore += 5;
  } else if (data.ttfb > 2000) {
    redFlags.push(`TTFB lent (${data.ttfb}ms) — serveur lent ou hébergement bas de gamme`);
    baseScore -= 10;
  } else if (data.ttfb > 4000) {
    redFlags.push(`TTFB très lent (${data.ttfb}ms) — site probablement non maintenu`);
    baseScore -= 20;
  }

  // ── TITLE ──
  if (!data.title || data.title.length < 10) {
    redFlags.push("Balise <title> absente ou trop courte — SEO inexistant");
    baseScore -= 15;
  } else if (data.title.toLowerCase().includes('accueil') || data.title.toLowerCase().includes('home')) {
    redFlags.push(`Title générique "${data.title}" — aucune valeur SEO`);
    baseScore -= 10;
  } else if (data.title.toLowerCase().includes('bienvenue')) {
    redFlags.push(`Title "Bienvenue" — classique site amateur des années 2010`);
    baseScore -= 12;
  } else {
    greenFlags.push(`Title présent : "${data.title.slice(0, 60)}"`);
    baseScore += 5;
  }

  // ── H1 ──
  if (!data.h1 || data.h1.trim().length < 3) {
    redFlags.push("H1 absent — problème SEO critique et clarté de l'offre nulle");
    baseScore -= 15;
  } else if (data.h1.toLowerCase().includes('bienvenue') || data.h1.toLowerCase().includes('welcome')) {
    redFlags.push(`H1 "${data.h1}" — ne communique aucune valeur, aucun service`);
    baseScore -= 10;
  } else {
    greenFlags.push(`H1 présent : "${data.h1.slice(0, 80)}"`);
    baseScore += 8;
  }

  // ── META DESCRIPTION ──
  if (!data.meta_desc || data.meta_desc.trim().length < 10) {
    redFlags.push("Meta description absente — invisible dans les résultats Google");
    baseScore -= 10;
  } else if (data.meta_desc.length < 50) {
    redFlags.push(`Meta description trop courte (${data.meta_desc.length} chars) — sous-optimale`);
    baseScore -= 5;
  } else {
    greenFlags.push("Meta description présente");
    baseScore += 5;
  }

  // ── LOCALISATION dans le contenu ──
  const fullText = `${data.title} ${data.h1} ${data.meta_desc}`.toLowerCase();
  if (ville && fullText.includes(ville.toLowerCase())) {
    greenFlags.push(`Ville "${ville}" mentionnée — SEO local présent`);
    baseScore += 8;
  } else if (ville) {
    signals.push(`Ville "${ville}" absente du contenu visible — SEO local manquant`);
    baseScore -= 5;
  }

  // ── SECTEUR dans le contenu ──
  const secteurKeywords = secteur.toLowerCase().split(' ');
  const secteurMentioned = secteurKeywords.some(kw => kw.length > 3 && fullText.includes(kw));
  if (secteurMentioned) {
    greenFlags.push(`Secteur "${secteur}" détecté dans le contenu`);
    baseScore += 5;
  } else {
    signals.push(`Secteur "${secteur}" non mentionné — offre peu claire`);
    baseScore -= 8;
  }

  // ── POTENTIEL DE TRANSFORMATION ──
  // Plus le site est basique, plus la refonte a de valeur
  const transformationScore = Math.max(0, Math.min(25,
    (redFlags.length * 5) - (greenFlags.length * 2)
  ));

  // Clamp du score final
  baseScore = Math.max(0, Math.min(100, baseScore));

  return { signals, redFlags, greenFlags, baseScore, transformationScore };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface QuickScanData {
  url?: string;
  title: string;
  h1: string;
  meta_desc: string;
  ttfb: number;
  status: number;
}

export interface EclaireurResult {
  go: boolean;                    // TRUE = lancer le pipeline complet
  score_eclaireur: number;        // 0–100
  raison_rejet?: string;          // Si go = false
  priorite: 'haute' | 'moyenne' | 'basse';
  red_flags: string[];
  green_flags: string[];
  signaux: string[];
  potentiel_transformation: number; // 0–25 — plus c'est haut, meilleur prospect
  email_detecte: string | null;
  resume_rapide: string;          // 1 phrase — ce que Gemini a compris du business
  next_action: string;            // Ce que l'orchestrateur doit faire ensuite
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function eclaireurAgent(
  quickData: QuickScanData,
  nom: string,
  secteur: string,
  ville: string,
  emailKnown?: string
): Promise<EclaireurResult> {

  // ── ÉTAPE 0 : Vérification données valides ──
  if (!quickData) {
    console.log(`[Éclaireur] ERREUR : quickData est null pour ${nom}`);
    return {
      go: false,
      score_eclaireur: 0,
      raison_rejet: "Impossible de scanner le site (timeout ou erreur réseau)",
      priorite: 'basse',
      red_flags: ['Site inaccessible'],
      green_flags: [],
      signaux: [],
      potentiel_transformation: 0,
      email_detecte: emailKnown || null,
      resume_rapide: "Site non accessible",
      next_action: "SKIP — site inaccessible"
    };
  }

  // ── ÉTAPE 1 : Rejets automatiques déterministes (zéro LLM, zéro coût) ──
  for (const [ruleName, ruleFn] of Object.entries(AUTO_REJECT_RULES)) {
    if (ruleFn(quickData)) {
      console.log(`[Éclaireur] REJET AUTO (${ruleName}) → ${nom}`);
      return {
        go: false,
        score_eclaireur: 0,
        raison_rejet: `Rejet automatique : ${ruleName}`,
        priorite: 'basse',
        red_flags: [`Règle ${ruleName} déclenchée`],
        green_flags: [],
        signaux: [],
        potentiel_transformation: 0,
        email_detecte: emailKnown || null,
        resume_rapide: "Site non exploitable pour prospection",
        next_action: "SKIP — ne pas lancer le pipeline"
      };
    }
  }

  // ── ÉTAPE 2 : Score déterministe (logique pure, sans LLM) ──
  const { signals, redFlags, greenFlags, baseScore, transformationScore } =
    computeQuickSignals(quickData, secteur, ville);

  // Rejet si score trop bas — inutile de payer Gemini
  if (baseScore < 20) {
    return {
      go: false,
      score_eclaireur: baseScore,
      raison_rejet: `Score trop bas (${baseScore}/100) — prospect non rentable`,
      priorite: 'basse',
      red_flags: redFlags,
      green_flags: greenFlags,
      signaux: signals,
      potentiel_transformation: transformationScore,
      email_detecte: emailKnown || null,
      resume_rapide: "Site avec trop de signaux négatifs pour justifier un audit complet",
      next_action: "SKIP — score insuffisant"
    };
  }

  // ── ÉTAPE 3 : Gemini Flash pour interprétation business (cas limites uniquement) ──
  // On l'appelle seulement si le score est entre 20 et 70 (zone grise)
  // En dessous de 20 → rejet automatique
  // Au dessus de 70 → GO automatique (prospect clairement intéressant)
  let geminiInterpretation: { resume: string; email: string | null; ajustement: number } | null = null;

  if (baseScore >= 20 && baseScore <= 70) {
    try {
      const model = gemini.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
      });

      const geminiPrompt = `Tu es un filtre de prospection pour une agence web.
Données d'un site web (extraites automatiquement — tu ne visites PAS l'URL) :

Entreprise : ${nom}
Secteur : ${secteur}
Ville : ${ville}
Title HTML : "${quickData.title}"
H1 : "${quickData.h1}"
Meta description : "${quickData.meta_desc}"
TTFB : ${quickData.ttfb}ms
HTTP Status : ${quickData.status}

Signaux détectés : ${redFlags.concat(greenFlags).join(' | ')}

Question : Ce prospect vaut-il la peine de lancer un audit complet (Playwright + Lighthouse, coûte 30s de serveur) ?
Extrait aussi l'email si visible dans les données.

Réponds UNIQUEMENT avec ce JSON (max 3 champs) :
{
  "resume": "<1 phrase — ce que fait ce business>",
  "email": "<email extrait des données ou null>",
  "ajustement": <nombre entre -20 et +20 — ajustement du score de base de ${baseScore}>
}`;

      const result = await callLLMWithRetry<any>(async () => {
        const response = await model.generateContent(geminiPrompt);
        return response.response.text();
      });

      if (result) {
        const cleaned = result.replace(/```json|```/g, '').trim();
        geminiInterpretation = JSON.parse(cleaned);
      }
    } catch (e) {
      console.warn("[Éclaireur] Gemini interpretation failed — using base score only:", e);
    }
  }

  // ── ÉTAPE 4 : Score final et décision ──
  const ajustement = geminiInterpretation?.ajustement || 0;
  const scoreFinal = Math.max(0, Math.min(100, baseScore + ajustement));

  // Auto-GO si score élevé même sans Gemini
  const isGo = scoreFinal >= 35 || baseScore > 70;

  const priorite: 'haute' | 'moyenne' | 'basse' =
    scoreFinal >= 70 ? 'haute' :
    scoreFinal >= 45 ? 'moyenne' : 'basse';

  const result: EclaireurResult = {
    go: isGo,
    score_eclaireur: scoreFinal,
    raison_rejet: !isGo ? `Score insuffisant (${scoreFinal}/100) — prospect peu rentable` : undefined,
    priorite,
    red_flags: redFlags,
    green_flags: greenFlags,
    signaux: signals,
    potentiel_transformation: transformationScore,
    email_detecte: geminiInterpretation?.email || emailKnown || null,
    resume_rapide: geminiInterpretation?.resume || `${nom} — ${secteur} à ${ville}`,
    next_action: isGo
      ? `LANCER PIPELINE — priorité ${priorite}`
      : "SKIP — score insuffisant pour justifier un audit complet"
  };

  console.log(`[Éclaireur] ${nom} → ${isGo ? '✅ GO' : '❌ NO-GO'} (score: ${scoreFinal}/100, priorité: ${priorite})`);
  return result;
}
