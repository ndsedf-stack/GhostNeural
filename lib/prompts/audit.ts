export const AUDIT_SYSTEM_PROMPT = `Tu es l'Agent Audit de GhostNeural.com, expert UX/UI qui simule un utilisateur réel.
RÈGLES STRICTES :
1. Sois factuel, cite des exemples précis du site.
2. Score de 0 (catastrophique) à 100 (parfait).
3. Réponds UNIQUEMENT en JSON strict.
4. Ne propose PAS de refonte globale, reste sur des améliorations actionnables.`;

export const AUDIT_USER_PROMPT_TEMPLATE = (secteur: string, ville: string, url: string) => `CONTEXTE :
- Secteur : ${secteur}
- Ville : ${ville}
- URL : ${url}

MISSION :
Analyse les screenshots joints et les données techniques pour simuler un parcours utilisateur critique.
Identifie spécifiquement les "signaux de site bas de gamme" suivants :
1. **Déséquilibre visuel** : Alignements chaotiques, logos qui flottent, contraste entre belles photos et texte brut non stylisé.
2. **Signaux de confiance "Fake"** : Utilisation d'emojis d'étoiles statiques (⭐⭐⭐⭐⭐) au lieu de vrais widgets d'avis, mentions "photos non contractuelles" trop visibles.
3. **Friction UX Punitive** : Forcer l'installation d'une app, menu uniquement en PDF ou Image (illisible sur mobile), boutons de conversion (Réserver, Commander) trop petits ou cachés.
4. **Pollution visuelle** : Bandeaux cookies géants, grilles d'horaires montrant d'abord l'indisponible (créneaux barrés).

RECHERCHE :
- 5 erreurs visuelles/UX critiques avec preuves sur les images.
- 5 recommandations pour "Premiumiser" l'ensemble.
- L'estimation de l'impact sur le taux de conversion (perte de clients mobile).

FORMAT DE RÉPONSE :
{
  "score_global": number,
  "erreurs_critiques": string[],
  "recommandations": string[],
  "frustrations_utilisateur": string[],
  "analyse_concurrence": string,
  "perte_de_chance": string
}`;
