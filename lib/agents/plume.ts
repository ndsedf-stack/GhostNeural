import { anthropic, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// LE PLUME — Agent email léger du Pipeline GhostAgency
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Email ultra-personnalisé, court, direct
// Modèle : Claude 3 Haiku (rapide, suffisant avec prompt guidé)
// Note : Si tu as le Copywriter + Critique dans ton pipeline, préfère-les.
//        Le Plume est un fallback léger ou un agent standalone.
// ─────────────────────────────────────────────────────────────────────────────

export async function plumeAgent(strategy: any, leadInfo: any) {
  try {
    // ── PATCH 1 : Prompt structuré — injecte les champs business utiles ──────
    // Plus de JSON.stringify(strategy) — on extrait ce qui compte
    const prompt = `
Tu es Le Plume de GhostAgency.
Tu rédiges un email de prospection ultra-personnalisé.

=== CONTEXTE ===
Entreprise : ${leadInfo.nom}
Site : ${leadInfo.site_web}

=== ANGLE STRATÉGIQUE ===
Angle : ${strategy.angle_approche || ''}
Friction majeure : ${strategy.point_friction_majeur || ''}
Coût de l'inaction : ${strategy.cout_inaction || ''}
Gain potentiel estimé : ${strategy.gain_potentiel_estime || ''}
Urgence business : ${strategy.urgence_business || ''}
Priorité d'action : ${strategy.priorite_action || ''}

=== MISSION ===
Rédige un email court (80–140 mots) qui :
- Cite au moins 1 élément concret de la stratégie ci-dessus
- Introduit une conséquence business claire (perte ou gain chiffré si disponible)
- Reste humain, direct et légèrement mystérieux (GhostAgency)
- Propose un appel de 10 min via un CTA conversationnel (pas "je souhaite vous présenter")
- Ne contient PAS : "J'espère que vous allez bien", formules robotiques, promesses irréalistes

Signature obligatoire : "Nicolas — GhostAgency"
Opt-out obligatoire en dernière ligne : "Si vous ne souhaitez plus recevoir d'analyses, dites-le moi."

Réponds UNIQUEMENT en JSON valide :
{
  "objet": "<Sujet percutant — chiffre ou observation concrète>",
  "corps": "<Corps de l'email>"
}
`;

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 600,
        system: `Tu rédiges des cold emails B2B courts et percutants pour une agence web française.
Tu réponds UNIQUEMENT en JSON valide. Zéro texte hors du JSON.`,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Échec Plume — réponse vide");

    // ── PATCH 2 : Parsing sécurisé — évite de casser le Critique en aval ────
    const cleaned = typeof result === 'string'
      ? result.replace(/```json|```/g, '').trim()
      : JSON.stringify(result);

    let json: any;
    try {
      json = extractJsonSafe(cleaned) || JSON.parse(cleaned);
    } catch {
      json = {};
    }

    return {
      objet: json.objet || `Observation sur ${leadInfo.nom}`,
      corps: json.corps || `Diagnostic disponible pour ${leadInfo.nom}.`,
    };

  } catch (error) {
    console.error("⚠️ Erreur Plume, fallback:", error);

    // Fallback minimal — injecte au moins le coût inaction si disponible
    const coutInaction = strategy?.cout_inaction;
    const corpsBase = `En analysant le site de ${leadInfo.nom}, on a identifié quelques frictions qui coûtent probablement des clients chaque mois.${coutInaction ? `\n\nEstimation : ${coutInaction}.` : ''}\n\nUn appel de 10 min pour en parler ?\n\nNicolas — GhostAgency\n\nSi vous ne souhaitez plus recevoir d'analyses, dites-le moi.`;

    return {
      objet: `Analyse pour ${leadInfo.nom}`,
      corps: corpsBase,
    };
  }
}