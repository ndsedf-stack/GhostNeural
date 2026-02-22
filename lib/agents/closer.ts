import { gemini } from '../llm-clients';
import { CLOSER_SYSTEM_PROMPT } from '../prompts/closer';
import { extractJsonSafe } from '../utils/json';

export async function runCloserAgent(data: {
  audit: any;
  strategy: any;
  archi: any;
  secteur: string;
}) {
  // 🧮 PRICING AI ULTRA-OPTIMISÉ (V7)
  const basePrice = 3000;
  
  // Facteurs de pondération
  const auditScore = data.audit.score_global || 50;
  const performanceFactor = auditScore < 40 ? 1.4 : 1;
  
  const diamondScore = data.strategy.business_potential_score || 0;
  const businessFactor = diamondScore > 80 ? 1.5 : 1;
  
  // Note: trafficFactor simulé si non présent dans audit_data (standard GhostAgency)
  const traffic = data.audit.visiteurs_mensuels || 0;
  const trafficFactor = traffic > 5000 ? 1.3 : 1;
  
  const finalPrice = Math.round(basePrice * performanceFactor * businessFactor * trafficFactor);

  const model = gemini.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2000,
      responseMimeType: "application/json",
    } as any
  });

  const userPrompt = `
DONNÉES D'ENTRÉE :
- Secteur : \${data.secteur}
- Score Global Actuel : \${auditScore}/100
- Pertes Business Estimées : \${JSON.stringify(data.audit.pertes_business)}
- Priorités Techniques : \${JSON.stringify(data.archi.priorites_techniques)}
- Mode Projet : \${data.archi.mode_projet}
- Angle d'Attaque Stratégique : \${data.strategy.angle_attaque}

PRIX FIXE (MATHÉMATIQUE) : \${finalPrice}€ HT

MISSION :
Génère la roadmap et l'offre commerciale correspondante. 
IMPORTANT : Le prix final doit être EXACTEMENT \${finalPrice}€ HT. Pas de fourchette.
Priorise le ROI annuel estimé avant de mentionner l'investissement.
`;

  try {
    const result = await model.generateContent([
      { text: CLOSER_SYSTEM_PROMPT },
      { text: userPrompt }
    ]);
    
    const response = result.response.text();
    const json = extractJsonSafe(response);
    
    if (!json) throw new Error("Échec de parsing JSON Closer");
    
    // Forcer le prix calculé si l'IA a dévié
    if (json.offre_packagee) {
      json.offre_packagee.prix_recommande = `\${finalPrice}€ HT`;
    }
    
    return json;
  } catch (error) {
    console.error("[Closer Agent] Erreur:", error);
    // Fallback minimaliste si l'IA échoue
    return {
      projected_roi_12months: {
        ca_additionnel_estime: "Données indisponibles",
        fct_multiplicateur: "2x min",
        raison_calcul: "Basé sur les standards du secteur"
      },
      roadmap: [
        { phase: "Audit & Planning", actions: ["Analyse approfondie"], delai: "24h", impact: "Cadrage" },
        { phase: "Exécution", actions: ["Mise en place des optimisations"], delai: "2-4 semaines", impact: "ROI" }
      ],
      offre_packagee: {
        nom: "Pack GhostNeural Custom",
        prix_recommande: "Sur devis",
        arguments_cles: ["ROI garanti", "Exécution ultra-rapide"],
        garantie: "Suivi post-lancement"
      }
    };
  }
}
