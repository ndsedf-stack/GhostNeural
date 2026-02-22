import { anthropic, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

/**
 * PROPOSAL GENERATOR AGENT — Closing Layer (V5)
 * Objectif : Transformer l’audit + closer output en une proposition commerciale premium.
 */

export interface ProposalOutput {
  resume_probleme: string;
  impact_business: string;
  solution_resume: string;
  offre: string;
  roi: string;
  garantie: string;
  timeline: string;
  next_step: string;
}

export async function runProposalGenerator(audit: any, closer: any, leadInfo: any): Promise<ProposalOutput> {
  const prompt = `
Tu es consultant senior GhostAgency.
Ta mission : transformer un audit digital en proposition commerciale claire et orientée décision.

CONTEXTE LEAD :
Entreprise : ${leadInfo.nom}
Secteur : ${leadInfo.secteur}

DONNÉES AUDIT :
Score Global : ${audit.score_global}/100
Points critiques : ${audit.faiblesses_majeures?.join(', ')}
Hémorragie business (CA Perdu) : ${audit.pertes_business || audit.ca_perdu_estime || 'Non quantifié'}

DONNÉES CLOSER (OFFRE) :
Offre Name : ${closer.offre_packagee?.nom}
Offre Prix : ${closer.offre_packagee?.prix_recommande}
ROI Projeté : ${closer.projected_roi_12months?.ca_additionnel_estime}
Feuille de route : ${JSON.stringify(closer.roadmap)}

RÈGLES STRICTES :
- Utilise uniquement les données fournies.
- Identifie UN SEUL problème business principal (le plus grave).
- Formule ce problème comme une perte concrète (réservations, clients, CA).
- Ton consultatif premium, jamais agressif. Toujours crédible.
- ROI avant prix.
- Garantie basée sur des actions mesurables (ex: correction 100% points critiques), jamais financière.
- Maximum 180 mots total.
- CTA final : validation stratégique + démarrage rapide.

FORMAT JSON STRICT :
{
 "resume_probleme": "description courte du point d'hémorragie",
 "impact_business": "conséquence financière ou opérationnelle",
 "solution_resume": "approche simplifiée GhostAgency",
 "roi": "bénéfice chiffré sur 12 mois",
 "offre": "détail de l'investissement fixe",
 "garantie": "engagement de performance technique",
 "timeline": "durée de mise en œuvre",
 "next_step": "action immédiate pour lancer"
}
`;

  try {
    const result = await callLLMWithRetry<string>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        temperature: 0.3,
        system: `Expert en closing B2B. Tu rédiges des propositions premium, ultra-concises et tranchantes. JSON uniquement.`,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text || '';
    });

    if (!result) throw new Error("Réponse vide");

    const cleaned = result.replace(/```json|```/g, '').trim();
    return extractJsonSafe(cleaned) || JSON.parse(cleaned);

  } catch (error) {
    console.error("Proposal Generator Error:", error);
    return {
      resume_probleme: "Votre site actuel ne convertit pas suffisamment vos visiteurs en clients.",
      impact_business: "Cette situation entraîne une perte de revenus mensuelle évitable.",
      solution_resume: "Une refonte stratégique axée sur la conversion et la performance technique.",
      offre: "Accompagnement GhostAgency Premium.",
      roi: "Récupération du CA perdu sous 3 à 6 mois.",
      garantie: "Optimisation de 100% des points critiques identifiés dans l'audit.",
      timeline: "Déploiement complet sous 30 jours.",
      next_step: "Validation du diagnostic pour démarrage lundi projeté."
    };
  }
}
