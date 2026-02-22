import { anthropic, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';
import { getWinningPattern } from '../knowledge/templates';

/**
 * COPYWRITER AGENT V6 — Closing First Architecture
 * Objectif : transformer audit + stratégie + ROI en conversation commerciale.
 */

function identifyPrimaryFriction(audit: any) {
  if (!audit) return "conversion insuffisante";

  const issues = audit.faiblesses_majeures || [];

  const priorityOrder = [
    "absence_cta",
    "lcp_critique",
    "conversion_faible",
    "seo_local_faible",
    "design_non_confiance"
  ];

  return priorityOrder.find(p => issues.includes(p)) || issues[0] || "conversion insuffisante";
}

function buildPrompt(strategy: any, lead: any, brain?: any) {
  const audit = lead.audit_data || {};
  const friction = identifyPrimaryFriction(audit);

  return `
Tu es Nicolas, consultant conversion senior chez GhostAgency.

MISSION :
Transformer un audit technique en message business qui déclenche une conversation.

PRINCIPES ABSOLUS :
- 2 problème majeur maximum.
- 3 problèmes secondaires maximum.
- Toujours traduire technique → impact business concret.
- Ne jamais détailler la solution complète.
- Objectif = réponse du prospect, pas éducation.

CONTEXTE LEAD
Entreprise : ${lead.nom}
Secteur : ${lead.secteur}
Ville : ${lead.ville}

AUDIT
Score global : ${audit.score_global}
Problème principal : ${friction}
Coût inaction : ${strategy.cout_inaction}
Gain potentiel : ${strategy.gain_potentiel_estime}

STRATÉGIE PSYCHOLOGIQUE
Angle : ${strategy.angle_approche}
Persona : ${strategy.profil_decideur || "dirigeant PME"}

WINNING PATTERNS
${getWinningPattern(lead.secteur)?.copy_levers?.join(', ') || "conversion locale"}

OFFRE / ROI
${lead.closer_data?.projected_roi_12months?.ca_additionnel_estime || "non précisé"}

CONTRAINTES EMAIL :
- < 110 mots
- 1 chiffre minimum
- CTA conversationnel obligatoire
- Ton : humain, crédible, consultant (pas vendeur)
- Mention subtile audit déjà réalisé

FORMAT JSON STRICT :

{
 "objet": "...",
 "email_final": "...",
 "angle_utilise": "...",
 "probleme_central": "...",
 "niveau_confiance": "faible|moyen|fort"
}
`;
}

export async function runCopywriterAgent(strategy: any, leadInfo: any, brainContext?: any) {
  try {
    const prompt = buildPrompt(strategy, leadInfo, brainContext);

    const result = await callLLMWithRetry<string>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        temperature: 0.55,
        system: `
Expert cold email B2B.
Objectif : réponse prospect.
Toujours concret, business, humain.
Jamais technique inutile.
JSON uniquement.
        `,
        messages: [{ role: "user", content: prompt }]
      });

      return (msg.content[0] as any).text || '';
    });

    if (!result) throw new Error("Copywriter response empty");

    const cleaned = result.replace(/```json|```/g, '').trim();
    const parsed = extractJsonSafe(cleaned) || JSON.parse(cleaned);

    return {
      objet: parsed.objet,
      corps: parsed.email_final,
      angle: parsed.angle_utilise,
      friction: parsed.probleme_central,
      confiance: parsed.niveau_confiance
    };

  } catch (error) {
    console.error("Copywriter V6 error:", error);

    return {
      objet: `Analyse rapide — ${leadInfo.nom}`,
      corps: `
Bonjour,

Nous avons analysé votre site récemment.

Un point bloque clairement vos conversions actuellement.
Rien d'alarmant, mais suffisamment impactant pour justifier un échange rapide.

Je peux vous partager l'extrait de l'analyse si utile.

Nicolas — GhostAgency
`,
      angle: "fallback",
      friction: "non défini",
      confiance: "faible"
    };
  }
}

// Export des prompts pour compatibilité avec les imports existants
export const COPY_SYSTEM_PROMPT = `Tu es le Copywriter de GhostAgency V6. Tu rédiges des messages business prioritaires.`;
export const COPY_USER_PROMPT_TEMPLATE = (lead: any, audit: any, proposition: any, brainContext?: any) =>
  buildPrompt(proposition, { ...lead, audit_data: audit }, brainContext);