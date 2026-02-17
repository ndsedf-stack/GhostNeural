import { anthropic, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// LE COPYWRITER — Phase 5 du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Rédiger l'email de prospection qui force l'ouverture et la réponse
// Modèle : Claude 3 Haiku (rapide, suffisant avec frameworks embarqués)
// Input : strategy (Stratège), leadInfo (nom, secteur, ville, audit_data, archi)
// Output : 3 variantes email + variante recommandée
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RÈGLES PAR TON — ce qui change selon le profil décideur
// ─────────────────────────────────────────────────────────────────────────────
const TON_RULES: Record<string, {
  longueur: string;
  style: string;
  formule_ouverture: string;
  formule_cloture: string;
  objet_style: string;
}> = {
  direct: {
    longueur: "80–120 mots",
    style: "Phrases courtes. Données factuelles. Pas de politesse excessive. Va droit au but.",
    formule_ouverture: "Pas de 'Bonjour [Prénom]' — commence par un fait ou une question déstabilisante",
    formule_cloture: "Une question fermée qui force une réponse oui/non",
    objet_style: "Court + chiffre + urgence (ex: '3 problèmes qui coûtent des clients à [Nom]')"
  },
  froid: {
    longueur: "60–90 mots",
    style: "Très factuel, aucune fioritures. Chiffres uniquement. Ton consultant externe.",
    formule_ouverture: "Commence par le constat chiffré le plus fort de l'audit",
    formule_cloture: "Proposition d'un appel de 10 minutes pour présenter le diagnostic",
    objet_style: "Factuel + métrique (ex: 'Diagnostic technique : [Nom] — 3 points critiques')"
  },
  premium: {
    longueur: "100–140 mots",
    style: "Élégant et respectueux. Pas de pression. Valorise l'interlocuteur avant de pointer les problèmes.",
    formule_ouverture: "Reconnaissance du secteur/business avant le diagnostic",
    formule_cloture: "Invitation douce à découvrir l'analyse — pas de pression",
    objet_style: "Subtil + curiosité (ex: 'Une observation sur la présence digitale de [Nom]')"
  },
  empathique: {
    longueur: "100–130 mots",
    style: "Compréhensif, axé sur la solution pas sur le problème. Montre qu'on comprend leur quotidien.",
    formule_ouverture: "Reconnaître la réalité de leur métier avant de parler du site",
    formule_cloture: "Proposition d'aide concrète sans jargon technique",
    objet_style: "Humain + bénéfice (ex: 'Comment [concurrent] remplit ses tables en semaine')"
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES — 3 exemples d'emails qui convertissent
// Un par framework (PAS / AIDA / Pattern Interrupt)
// ─────────────────────────────────────────────────────────────────────────────
const FEW_SHOT_EMAILS = `
=== VARIANTE A — Framework PAS (Problem / Agitate / Solve) ===
Secteur : Restaurant | Ton : Direct
Objet : "Votre site charge en 8s — 53% de vos visiteurs sont déjà partis"
Corps :
"Votre site met 8 secondes à charger sur mobile. À ce stade, plus de la moitié de vos visiteurs ont fermé l'onglet — sans voir une seule photo de votre menu.

Vos concurrents directs ont un LCP sous 2 secondes et un bouton de réservation visible dès l'arrivée.

J'ai le diagnostic complet de votre site. 15 minutes pour vous le présenter ?

Nicolas — GhostNeural

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'."

Pourquoi ça marche : chiffre précis (8s) → conséquence concrète (53%) → comparaison concurrents → micro-engagement (15 min)

=== VARIANTE B — Framework AIDA (Attention / Interest / Desire / Action) ===
Secteur : Avocat | Ton : Premium
Objet : "Une observation sur la visibilité digitale de votre cabinet"
Corps :
"Votre cabinet traite des dossiers complexes — votre réputation parle pour vous.

Pourtant, en analysant votre présence en ligne, j'ai identifié 3 points qui freinent les nouveaux mandants : une spécialisation peu lisible en première lecture, aucun formulaire de pré-qualification, et un temps de chargement qui pénalise votre ranking Google.

Résultat estimé : entre 3 et 5 nouveaux dossiers/mois non captés actuellement.

Je peux vous envoyer l'analyse complète si vous souhaitez en discuter.

Nicolas — GhostNeural

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'."

Pourquoi ça marche : valorise d'abord (réputation) → problème progressif → chiffre désirable (3–5 dossiers) → invitation sans pression

=== VARIANTE C — Pattern Interrupt (brise le schéma habituel) ===
Secteur : Plombier | Ton : Froid
Objet : "Diagnostic technique — Plomberie Martin — 2 alertes critiques"
Corps :
"Audit automatique effectué sur votre site ce matin :

— Aucun formulaire de devis détecté (vos visiteurs ne peuvent pas vous contacter sans téléphoner)
— TTFB 4.2s (votre site charge 3x plus lentement que la moyenne du secteur)

Estimation : 8 à 12 demandes de devis/mois non reçues.

Rapport complet disponible. Souhaitez-vous le recevoir ?

Nicolas — GhostNeural

Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'."

Pourquoi ça marche : format liste = lisibilité immédiate → données précises → chiffre business → question fermée
`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRE — Garantit la présence de la ligne opt-out RGPD
// Injectée côté serveur sur chaque variante — filet de sécurité si le LLM l'oublie
// ─────────────────────────────────────────────────────────────────────────────
const OPT_OUT_LINE = "Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'.";

function ensureOptOut(corps: string): string {
  if (!corps) return corps;
  if (corps.toLowerCase().includes('stop') || corps.toLowerCase().includes('opt-out') || corps.toLowerCase().includes('ne souhaitez plus')) {
    return corps; // Déjà présente
  }
  return `${corps.trimEnd()}\n\n${OPT_OUT_LINE}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTEUR DU PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function buildCopywriterPrompt(strategy: any, leadInfo: any, brainContext?: any, previousIssues?: string[]): string {
  const auditData   = leadInfo.audit_data   || {};
  const vitals      = auditData.core_web_vitals || {};
  const pillars     = auditData.analyse_piliers || {};
  const impact      = auditData.estimation_impact || {};
  const archi       = leadInfo.archi_data    || {};

  const tonRecommande = brainContext?.brain_ton || strategy.ton_recommande || 'direct';
  const tonRules = TON_RULES[tonRecommande] || TON_RULES.direct;

  // Extraire les 2–3 métriques les plus percutantes pour l'email
  const metrics: string[] = [];
  if (vitals.lcp && parseFloat(vitals.lcp) > 2.5) {
    metrics.push(`LCP ${vitals.lcp} (site lent — visiteurs qui partent)`);
  }
  if (vitals.performance_score && vitals.performance_score < 60) {
    metrics.push(`Score performance ${vitals.performance_score}/100`);
  }
  if (pillars.parcours_ux?.score !== undefined && pillars.parcours_ux.score < 5) {
    metrics.push(`Parcours UX ${pillars.parcours_ux.score}/10 — ${pillars.parcours_ux.observation?.slice(0, 100) || 'navigation confuse'}`);
  }
  if (pillars.esthetique?.score !== undefined && pillars.esthetique.score < 4) {
    metrics.push(`Design ${pillars.esthetique.score}/10 — ${pillars.esthetique.observation?.slice(0, 100) || 'image de marque inexistante'}`);
  }
  if (!auditData.seo?.sitemap_present) {
    metrics.push("Sitemap absent — invisible pour Google");
  }
  if (impact.visiteurs_perdus_par_mois) {
    metrics.push(`~${impact.visiteurs_perdus_par_mois} visiteurs perdus/mois`);
  }
  if (impact.ca_non_capte_estime) {
    metrics.push(`CA non capté estimé : ${impact.ca_non_capte_estime}`);
  }

  return `Tu es un expert en cold email B2B chez GhostNeural.
Tu rédiges des emails de prospection pour vendre des refontes web à des TPE/PME françaises.
Tu n'envoies JAMAIS d'emails génériques — chaque email cite des données réelles du site du prospect.

=== PROFIL DU PROSPECT ===
Entreprise : ${leadInfo.nom}
Secteur : ${leadInfo.secteur || leadInfo.sector || 'TPE/PME'}
Ville : ${leadInfo.ville || leadInfo.city || 'France'}
Site web : ${leadInfo.site_web || leadInfo.website || ''}
Score audit global : ${auditData.score_global || 'N/A'}/100

=== ANGLE STRATÉGIQUE (défini par le Stratège) ===
Angle d'approche : ${strategy.angle_approche || 'Optimisation digitale'}
Point de friction majeur : ${strategy.point_friction_majeur || 'Présence digitale insuffisante'}
Solution proposée : ${strategy.solution_strategique || 'Refonte web conversion-first'}
Ton recommandé : ${tonRecommande}
${strategy.buyer_persona ? `
Profil décideur : ${strategy.buyer_persona.profil || ''}
Objection probable : "${strategy.buyer_persona.objection_probable || ''}"
Réponse à l'objection : "${strategy.buyer_persona.reponse_cle || ''}"` : ''}
${strategy.timing_ideal ? `Timing optimal : ${strategy.timing_ideal}` : ''}
${strategy.preuve_sociale ? `Preuve sociale : ${strategy.preuve_sociale}` : ''}
${strategy.budget_roi ? `Budget/ROI : ${strategy.budget_roi}` : ''}

=== INSTRUCTIONS DU BRAIN (ORCHESTRATEUR) ===
${brainContext?.brain_instructions ? `DIRECTIVES : ${brainContext.brain_instructions}` : 'Pas de directives spécifiques.'}
${brainContext?.brain_hook ? `HOOK DÉCIDÉ : ${brainContext.brain_hook}` : ''}
${brainContext?.brain_ca_perdu ? `CA PERDU ESTIMÉ : ${brainContext.brain_ca_perdu}` : ''}

${previousIssues && previousIssues.length > 0 ? `=== ALERTES / RETOURS SUR LA VERSION PRÉCÉDENTE (RETRY) ===
Le Brain a rejeté ta version précédente pour les raisons suivantes :
${previousIssues.map(i => `- ${i}`).join('\n')}
Tu DOIS impérativement corriger ces points pour cette version.` : ''}

=== MÉTRIQUES RÉELLES DE L'AUDIT ===
${metrics.length > 0 ? metrics.map(m => `— ${m}`).join('\n') : '— Score global bas : ' + (auditData.score_global || 'N/A') + '/100'}

=== TRANSFORMATION PROPOSÉE (Architecte) ===
${archi.proposition_valeur ? `Proposition de valeur : ${archi.proposition_valeur}` : ''}
${archi.cta ? `CTA principal : ${archi.cta}` : ''}
${archi.conversion_funnel ? `Parcours proposé : ${archi.conversion_funnel}` : ''}

=== RÈGLES DE TON (${tonRecommande.toUpperCase()}) ===
Longueur cible : ${tonRules.longueur}
Style : ${tonRules.style}
Ouverture : ${tonRules.formule_ouverture}
Clôture : ${tonRules.formule_cloture}
Style d'objet : ${tonRules.objet_style}

=== EXEMPLES D'EMAILS QUI CONVERTISSENT ===
${FEW_SHOT_EMAILS}

=== TA MISSION ===
Rédige 3 variantes d'email pour ${leadInfo.nom} :
- Variante A : Framework PAS (Problem / Agitate / Solve) — ton ${tonRecommande}
- Variante B : Framework AIDA (Attention / Intérêt / Désir / Action) — ton ${tonRecommande}  
- Variante C : Pattern Interrupt (commence par les données brutes de l'audit)

RÈGLES ABSOLUES :
- Chaque email DOIT citer au moins 1 métrique réelle de l'audit ci-dessus
- L'objet ne doit PAS contenir "Urgence Digitale" ou "Transformation" — trop vu
- Signature : "Nicolas — GhostNeural" (jamais de "Cordialement" ni "Bien à vous")
- Pas de liens dans le corps — l'objectif est une RÉPONSE, pas un clic
- L'email se termine par une question fermée ou une proposition d'appel de 15 min
- Applique les instructions du Brain de GhostNeural ci-dessus si elles sont fournies.
- JAMAIS de promesses irréalistes ("multipliez votre CA par 10")
- OBLIGATOIRE — dernière ligne de chaque email (après la signature) : "Si vous ne souhaitez plus recevoir ce type d'analyse, répondez simplement 'Stop'." (conformité RGPD B2B — sans cette ligne l'email ne part pas)

RÉPONDS UNIQUEMENT EN JSON :
{
  "variante_a": {
    "framework": "PAS",
    "objet": "<Objet email A>",
    "corps": "<Corps email A — ${tonRules.longueur}>",
    "angle": "<En 5 mots — pourquoi cet email va marcher>"
  },
  "variante_b": {
    "framework": "AIDA",
    "objet": "<Objet email B>",
    "corps": "<Corps email B>",
    "angle": "<En 5 mots>"
  },
  "variante_c": {
    "framework": "Pattern Interrupt",
    "objet": "<Objet email C>",
    "corps": "<Corps email C>",
    "angle": "<En 5 mots>"
  },
  "recommandation": "<A, B ou C> — <raison en 1 phrase basée sur le profil décideur>",
  "objet": "<L'objet de la variante recommandée — pour compatibilité UI>",
  "corps": "<Le corps de la variante recommandée — pour compatibilité UI>"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function runCopywriterAgent(strategy: any, leadInfo: any, brainContext?: any, previousIssues?: string[]) {
  try {
    const prompt = buildCopywriterPrompt(strategy, leadInfo, brainContext, previousIssues);

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1200,
        temperature: 0.6, // Plus de créativité pour les emails — on veut de la variété
        system: `Tu es un expert en cold email B2B pour une agence web française.
Tu rédiges des emails courts, factuels et personnalisés qui génèrent des réponses.
Tu réponds UNIQUEMENT en JSON valide. Zéro texte hors du JSON.
Règle d'or : si tu ne peux pas citer une donnée réelle de l'audit, n'écris pas l'email.`,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Échec Copywriter — réponse vide");

    const cleaned = typeof result === 'string'
      ? result.replace(/```json|```/g, '').trim()
      : JSON.stringify(result);

    const json = extractJsonSafe(cleaned) || JSON.parse(cleaned);

    // Vérification anti-générique sur l'objet
    const genericObjects = ['urgence digitale', 'transformation', 'votre site web', 'votre présence'];
    const objetFinal = json.objet || '';
    if (genericObjects.some(g => objetFinal.toLowerCase().includes(g))) {
      console.warn(`[Copywriter] ⚠️ Objet potentiellement générique: "${objetFinal}"`);
    }

    return {
      // Compatibilité UI existante — les champs objet/corps pointent vers la variante recommandée
      objet:        json.objet        || json.variante_a?.objet  || `Analyse de ${leadInfo.nom}`,
      corps:        ensureOptOut(json.corps || json.variante_a?.corps || `Diagnostic disponible pour ${leadInfo.nom}.`),
      // Variantes A/B/C — opt-out garanti sur chacune
      variante_a:   json.variante_a   ? { ...json.variante_a, corps: ensureOptOut(json.variante_a.corps) } : null,
      variante_b:   json.variante_b   ? { ...json.variante_b, corps: ensureOptOut(json.variante_b.corps) } : null,
      variante_c:   json.variante_c   ? { ...json.variante_c, corps: ensureOptOut(json.variante_c.corps) } : null,
      recommandation: json.recommandation || "A — défaut",
    };

  } catch (error) {
    console.error("⚠️ Erreur Copywriter:", error);

    // Fallback : reconstruit un email minimal avec les vraies données disponibles
    const auditData = leadInfo.audit_data || {};
    const vitals    = auditData.core_web_vitals || {};
    const scoreGlobal = auditData.score_global;

    const fallbackCorps = scoreGlobal
      ? `En analysant le site de ${leadInfo.nom}, notre outil a détecté un score de performance de ${scoreGlobal}/100${vitals.lcp ? ` et un temps de chargement de ${vitals.lcp}` : ''} — en dessous des standards de votre secteur.\n\nJ'ai le diagnostic complet. 15 minutes pour en parler ?\n\nNicolas — GhostNeural`
      : `Bonjour,\n\nJ'ai analysé le site de ${leadInfo.nom} et identifié plusieurs axes d'amélioration pour votre visibilité et conversion.\n\nDiagnostic disponible sur demande.\n\nNicolas — GhostNeural`;

    return {
      objet:          `Analyse site — ${leadInfo.nom}`,
      corps:          ensureOptOut(fallbackCorps),
      variante_a:     null,
      variante_b:     null,
      variante_c:     null,
      recommandation: "fallback",
    };
  }
}

// Export des prompts pour compatibilité avec les imports existants
export const COPY_SYSTEM_PROMPT = `Tu es le Copywriter de GhostNeural. Tu rédiges des cold emails B2B personnalisés basés sur des données d'audit réelles.`;
export const COPY_USER_PROMPT_TEMPLATE = (lead: any, audit: any, proposition: any, brainContext?: any, previousIssues?: string[]) =>
  buildCopywriterPrompt(proposition, { ...lead, audit_data: audit }, brainContext, previousIssues);
