/**
 * 🏰 WINNING TEMPLATES LIBRARY
 * Centralise les patterns de conversion qui fonctionnent par secteur.
 * Utilisé par l'Architecte et le Copywriter pour injecter du "déjà prouvé".
 */

export const WINNING_PATTERNS: Record<string, {
  hero_structure: string;
  copy_levers: string[];
  cta_label: string;
  trust_signals: string[];
}> = {
  restaurant: {
    hero_structure: "Visuel immersif (Plat signature) + Titre émotionnel + Bouton réservation immédiat",
    copy_levers: ["Fraîcheur des produits", "Ambiance unique", "Facilité de réservation"],
    cta_label: "Réserver une table",
    trust_signals: ["Notes Google > 4.5", "Label 'Fait Maison'", "Photos de la salle"]
  },
  avocat: {
    hero_structure: "Portrait pro (Confiance) + Valeur ajoutée claire + Rappel d'urgence",
    copy_levers: ["Expertise reconnue", "Réactivité 24h", "Premier rendez-vous offert"],
    cta_label: "Prendre rendez-vous",
    trust_signals: ["Barreau de [Ville]", "Nombre d'années d'expérience", "Domaines de spécialisation"]
  },
  artisan: {
    hero_structure: "Photo avant/après ou chantier en cours + Réassurance immédiate (Garantie)",
    copy_levers: ["Travail soigné", "Devis gratuit en 48h", "Garantie Décennale"],
    cta_label: "Demander mon devis gratuit",
    trust_signals: ["Labels RGE/Qualibat", "Assurance décennale", "Photos chantiers locaux"]
  },
  default: {
    hero_structure: "Proposition de valeur claire + Sous-titre bénéfice + CTA contrasté",
    copy_levers: ["Simplicité", "Gain de temps", "Résultat garanti"],
    cta_label: "En savoir plus",
    trust_signals: ["Témoignages clients", "Partenaires officiels"]
  }
};

export function getWinningPattern(sector: string) {
  const key = Object.keys(WINNING_PATTERNS).find(k => sector.toLowerCase().includes(k)) || 'default';
  return WINNING_PATTERNS[key];
}
