/**
 * SEQUENCER V4.1 — GhostAgency
 * Humain, vendeur, classe, respectueux
 *
 * V4.1 vs V4 :
 * - Micro-aspérités humaines injectées par pattern (pas aléatoire)
 * - Voix plus personnelle et incarnée
 * - Rythme irrégulier (court / long / rupture)
 * - Transitions moins "LLM"
 * - Breakup plus sincère
 */

export interface ProspectContext {
  nom?: string;
  secteur?: string;
  ville?: string;
  opportunite_score?: number;
  maturite_digitale?: 'faible' | 'moyenne' | 'forte' | 'faible à moyenne';
  pression_concurrentielle?: 'faible' | 'moyenne' | 'forte';
  impact_business?: {
    leads_perdus_estime?: string;
    ca_non_capte_estime?: string;
    niveau_urgence?: 'faible' | 'modéré' | 'élevé';
  };
  cout_inaction?: string;
  angle_approche?: string;
}

export interface EmailSequenceStep {
  step: number;
  delayDays: number;
  subject: string;
  body: string;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function computeUrgencyScore(ctx?: ProspectContext): number {
  let score = ctx?.opportunite_score || 50;
  if (ctx?.pression_concurrentielle === 'forte') score += 10;
  if (ctx?.impact_business?.niveau_urgence === 'élevé') score += 10;
  return Math.min(100, score);
}

function computeDynamicDelay(step: number, urgency: number): number {
  if (urgency > 80) return [0, 1, 3, 7][step - 1] ?? 7;
  if (urgency > 60) return [0, 2, 5, 10][step - 1] ?? 10;
  return [0, 3, 7, 14][step - 1] ?? 14;
}

function pickAngle(step: number, ctx?: ProspectContext): string {
  if (step === 1) return 'value';
  if (step === 2) return ctx?.maturite_digitale?.includes('faible') ? 'education' : 'insight';
  if (step === 3) return 'proof';
  return 'breakup';
}

const STEP_SUBJECTS: Record<number, string[]> = {
  2: [
    "Une chose que j'ai oublié de mentionner",
    "Question rapide",
    "Observation complémentaire",
    "Je me posais une question",
  ],
  3: [
    "Un cas similaire dans votre secteur",
    "Ce qu'on a vu récemment",
    "Retour d'expérience rapide",
    "Cas concret — 2 minutes",
  ],
  4: [
    "Je ferme le dossier",
    "Dernière chose",
    "Je ne veux pas insister",
    "On se dit au revoir ?",
  ],
};

function pickSubject(step: number, originalSubject?: string, seed = 0): string {
  if (step === 1) return originalSubject || "Observation sur votre site";
  const list = STEP_SUBJECTS[step] || ["Relance"];
  return list[seed % list.length];
}

const OPENERS = [
  (first: string) => `${first},`,
  (first: string) => `Bonjour ${first},`,
  (first: string) => `${first} —`,
  (first: string) => `Bonsoir ${first},`,
];

function pickOpener(step: number, firstName: string): string {
  return OPENERS[(step - 1) % OPENERS.length](firstName);
}

// ── Observations situées semi-spécifiques par secteur ────────────────────────
// Donnent l'impression d'une analyse réelle sans scraping ni hallucination
const SECTOR_OBSERVATIONS: Record<string, string[]> = {
  restaurant: [
    "Dans la restauration, les pages d'accueil sont souvent trop chargées — le prospect cherche les horaires et repart sans trouver.",
    "On voit souvent des menus en PDF sur mobile. Ça bloque beaucoup plus de réservations qu'on ne le pense.",
    "Les avis Google sont rarement mis en avant alors que c'est le premier truc que les gens cherchent.",
  ],
  avocat: [
    "Les cabinets d'avocats sous-estiment souvent l'impact d'une spécialisation floue en première lecture.",
    "Un formulaire de qualification en 3 questions change complètement la qualité des contacts entrants.",
    "On voit beaucoup de sites de cabinets sans aucune preuve sociale — zéro témoignage, zéro résultat anonymisé.",
  ],
  artisan: [
    "Les artisans perdent beaucoup de devis parce qu'il n'y a pas de formulaire visible en dehors des heures de travail.",
    "Un portfolio avec des photos avant/après change tout — les gens veulent voir, pas lire.",
    "La zone d'intervention n'est jamais claire. Le prospect ne sait pas si vous intervenez chez lui.",
  ],
  coiffeur: [
    "La réservation en ligne est souvent absente ou cachée — alors que c'est la première chose que cherche une nouvelle cliente.",
    "Les tarifs ne sont jamais affichés. C'est une friction énorme pour les nouveaux prospects.",
    "Instagram attire l'œil, mais sans site qui convertit derrière, les followers ne deviennent pas clientes.",
  ],
  immobilier: [
    "Les agences dépendent trop des portails alors qu'un site propre peut générer des leads vendeurs en direct.",
    "On voit rarement le nombre de transactions affichées — pourtant c'est ce qui crée la confiance locale.",
    "Les formulaires d'estimation en ligne sont sous-utilisés alors qu'ils qualifient parfaitement les vendeurs.",
  ],
  default: [
    "Les formulaires de contact sont souvent trop longs ou mal placés — les gens abandonnent avant d'envoyer.",
    "La version mobile est rarement testée réellement. Ce qu'on voit sur desktop n'est pas ce que voit le prospect.",
    "L'accroche en haut de page est généralement trop générique pour convaincre en 5 secondes.",
  ],
};

function getSectorObservation(secteur?: string, seed = 0): string {
  const key = secteur
    ? Object.keys(SECTOR_OBSERVATIONS).find(k => secteur.toLowerCase().includes(k)) || 'default'
    : 'default';
  const list = SECTOR_OBSERVATIONS[key];
  return list[seed % list.length];
}

// ── Micro-aspérités humaines par angle ───────────────────────────────────────
// Injectées de façon déterministe — pas aléatoire, pas excessif
const HUMAN_TOUCHES: Record<string, string> = {
  education: "Rien de dramatique.",
  insight:   "Bref.",
  proof:     "Je préfère être direct.",
  breakup:   "Je préfère clôturer proprement plutôt que d'enchaîner les relances.",
};

/* -------------------------------------------------------------------------- */
/* CORPS D'EMAILS                                                             */
/* -------------------------------------------------------------------------- */

function buildEducationEmail(firstName: string, ctx?: ProspectContext, seed = 0): string {
  const secteur     = ctx?.secteur || 'votre secteur';
  const ville       = ctx?.ville   ? ` à ${ctx.ville}` : '';
  const cout        = ctx?.cout_inaction || ctx?.impact_business?.ca_non_capte_estime;
  const observation = getSectorObservation(ctx?.secteur, seed);

  return `${pickOpener(2, firstName)}

Je vous partage un point que je vois souvent revenir.

${observation}${ville ? ` Surtout${ville}.` : ''}${cout ? `\n\nSur un trafic même modeste, ça peut représenter ${cout} de CA qui s'évapore chaque mois.` : ''}

${HUMAN_TOUCHES.education} Souvent, c'est une phrase reformulée, un bouton déplacé, ou un bloc clarifié. Des ajustements simples, mais qui changent vraiment la donne.

C'est ce genre de choses que j'aimerais vous montrer.

Nicolas — GhostAgency

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'.`;
}

function buildInsightEmail(firstName: string, ctx?: ProspectContext, seed = 0): string {
  const secteur     = ctx?.secteur || 'votre domaine';
  const ville       = ctx?.ville   ? ` à ${ctx.ville}` : '';
  const observation = getSectorObservation(ctx?.secteur, seed + 1);

  return `${pickOpener(2, firstName)}

Je regardais votre marché${ville} cette semaine.

Sans citer de noms, plusieurs acteurs du ${secteur} ont refondu leur présence ces derniers mois. Pas forcément des sites spectaculaires — juste plus clairs, plus rapides sur mobile, avec un parcours plus direct vers la prise de contact.

Au passage : ${observation.charAt(0).toLowerCase() + observation.slice(1)}

${HUMAN_TOUCHES.insight} Ils captent en priorité les prospects qui comparent.

Vous avez vu ça de votre côté ?

Nicolas — GhostAgency

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'.`;
}

function buildProofEmail(firstName: string, ctx?: ProspectContext, seed = 0): string {
  const secteur = ctx?.secteur || 'ce secteur';
  const angle   = ctx?.angle_approche;

  return `${pickOpener(3, firstName)}

${HUMAN_TOUCHES.proof} — un exemple concret, parce que les généralités ne servent à rien.

On a travaillé récemment avec un profil similaire au vôtre dans le ${secteur}. Le site n'était pas mauvais — il manquait un formulaire visible, une page mobile correcte, et une accroche claire en haut de page. On a corrigé exactement ça.${angle ? `\n\n${angle} — c'était précisément le sujet.` : ''}

Trois semaines après : les demandes avaient plus que doublé. Sans budget pub.

Je vous dis ça parce que je le vois toutes les semaines — pas pour impressionner.

Ça vaut le coup qu'on en parle 10 minutes ?

Nicolas — GhostAgency

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'.`;
}

function buildBreakupEmail(firstName: string, ctx?: ProspectContext): string {
  const secteur = ctx?.secteur;

  return `${pickOpener(4, firstName)}

${HUMAN_TOUCHES.breakup}.

Si ce n'est pas le bon moment — ou simplement pas une priorité — c'est tout à fait normal. Je ne cherche pas à forcer la main.${secteur ? `\n\nJe garde votre dossier dans un coin. Si la question revient sur la table, vous savez où me trouver.` : `\n\nSi ça revient sur la table un jour, vous savez où me trouver.`}

Bonne continuation,

Nicolas — GhostAgency

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'.`;
}

/* -------------------------------------------------------------------------- */
/* MAIN AGENT                                                                 */
/* -------------------------------------------------------------------------- */

export async function generateSequenceEmail(
  originalEmail: any,
  step: number,
  context?: ProspectContext
): Promise<EmailSequenceStep | null> {
  if (step < 1 || step > 4) return null;

  const rawName   = context?.nom || originalEmail.nom || '';
  const firstName = rawName.split(/[\s@.]/)[0] || 'Bonjour';

  const urgency = computeUrgencyScore(context);
  const delay   = computeDynamicDelay(step, urgency);
  const angle   = pickAngle(step, context);
  const seed    = Math.floor(urgency / 25);
  const subject = pickSubject(step, originalEmail.objet, seed);

  // Step 1 = email original du Copywriter — pas de régénération
  if (step === 1) {
    return {
      step,
      delayDays: delay,
      subject:   originalEmail.objet || subject,
      body:      originalEmail.corps || '',
    };
  }

  let body = '';

  switch (angle) {
    case 'education':
      body = buildEducationEmail(firstName, context, seed);
      break;
    case 'insight':
      body = buildInsightEmail(firstName, context, seed);
      break;
    case 'proof':
      body = buildProofEmail(firstName, context, seed);
      break;
    case 'breakup':
      body = buildBreakupEmail(firstName, context);
      break;
    default:
      body = buildInsightEmail(firstName, context, seed);
  }

  return { step, delayDays: delay, subject, body };
}