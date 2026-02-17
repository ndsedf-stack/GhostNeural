import { anthropic, callLLMWithRetry } from '../llm-clients';

/**
 * Agent: Le Plume
 * Role: Rédige l'email personnalisé basé sur la stratégie.
 * Model: Claude 3 Haiku (Rapide/Humain)
 */
export async function plumeAgent(strategy: any, leadInfo: any) {
  try {
    const prompt = `
      Tu es le Plume de GhostAgency. Rédige un email de prospection ultra-personnalisé, court et percutant.
      Stratégie: ${JSON.stringify(strategy)}
      Client: ${leadInfo.nom} (${leadInfo.site_web})

      Contraintes:
      - Pas de "J'espère que vous allez bien"
      - Pas de blabla corporatif
      - Objectif: Proposer un appel de 10 min
      - Inclure IMPÉRATIVEMENT cette ligne d'opt-out à la fin: "Si vous ne souhaitez plus recevoir d'analyses, dites-le moi."
      - Direct, empathique, et mystérieux (GhostAgency)

      Réponds UNIQUEMENT en JSON avec cette structure:
      {
        "objet": "Sujet percutant",
        "corps": "Corps de l'email"
      }
    `;

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Échec Plume");
    return result;

  } catch (error) {
    console.error("⚠️ Erreur Plume, fallback:", error);
    return {
      "objet": `Analyse pour ${leadInfo.nom}`,
      "corps": `Bonjour,\n\nJ'ai analysé votre site ${leadInfo.site_web} et j'ai identifié quelques leviers de croissance majeurs pour votre activité.\n\nSeriez-vous ouvert à un appel de 10 minutes pour en discuter ?\n\nSi vous ne souhaitez plus recevoir d'analyses, dites-le moi.`
    };
  }
}
