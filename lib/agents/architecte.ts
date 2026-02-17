import { anthropic, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// L'ARCHITECTE — Phase 4 du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Concevoir la structure du nouveau site qui convertit
// Modèle : Claude 3 Haiku (suffisant avec templates sectoriels embarqués)
// Input : auditData (piliers + score + sitemap_cible), sector, city
// Output : arborescence, wireframe détaillé, CTA, style, proposition de valeur
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES SECTORIELS — Structure de base par secteur
// L'agent personnalise depuis ces bases — pas de page générique
// ─────────────────────────────────────────────────────────────────────────────
const SECTOR_TEMPLATES: Record<string, {
  pages: string[];
  cta_principal: string;
  cta_secondaire: string;
  hero_format: string;
  sections_obligatoires: string[];
  fonctionnalites_cles: string[];
  style_recommande: string;
  conversion_mechanic: string;
}> = {
  restaurant: {
    pages: [
      "Accueil — Hero appétissant + CTA réservation immédiat",
      "Menu & Spécialités — Plats HD avec prix et allergènes",
      "Réserver une Table — Calendrier inline ou widget TheFork",
      "Notre Histoire — Chef, équipe, valeurs et photos authentiques",
      "Infos Pratiques — Adresse, horaires, parking, accès"
    ],
    cta_principal: "Réserver une table",
    cta_secondaire: "Voir le menu",
    hero_format: "Photo plat signature HD en plein écran + overlay sombre + titre accrocheur + bouton réservation",
    sections_obligatoires: ["Note Google visible (★★★★☆ + nb avis)", "Galerie plats HD", "Horaires semaine/weekend", "Carte Google Maps embed"],
    fonctionnalites_cles: ["Réservation en ligne (TheFork/widget custom)", "Menu interactif (non PDF)", "Galerie photos", "Avis Google intégrés en temps réel"],
    style_recommande: "Chaleureux et premium — tons chauds, typographie élégante (Playfair Display), photos HD",
    conversion_mechanic: "Visiteur voit le plat → envie → réserve en 2 clics depuis le hero"
  },
  avocat: {
    pages: [
      "Accueil — Positionnement clair + domaines de droit en 3 secondes",
      "Nos Domaines — Landing page par spécialité (divorce, pénal, affaires...)",
      "Pourquoi Nous — Résultats anonymisés, années d'expérience, barreau",
      "Prendre RDV — Formulaire de qualification en 3 questions + Calendly",
      "FAQ Juridique — Questions fréquentes par domaine (SEO longue traîne)"
    ],
    cta_principal: "Consultation gratuite 30 min",
    cta_secondaire: "Voir nos domaines",
    hero_format: "Photo cabinet professionnel + titre de spécialisation + sous-titre rassurant + bouton RDV",
    sections_obligatoires: ["Barreau d'appartenance visible", "Spécialisations lisibles en 3s", "Photo professionnelle équipe", "Formulaire contact qualifié"],
    fonctionnalites_cles: ["Formulaire de qualification cas (3 champs)", "Calendly ou RDV en ligne", "Page par domaine juridique", "Section résultats anonymisés"],
    style_recommande: "Sobre et autoritaire — blanc/bleu marine, Cormorant + Source Sans Pro, minimaliste",
    conversion_mechanic: "Prospect qualifie son cas en 3 questions → RDV automatique → dossier qualifié"
  },
  coiffeur: {
    pages: [
      "Accueil — Portfolio réalisations + bouton réservation immédiat",
      "Nos Prestations — Services avec tarifs complets et durées",
      "Réserver en Ligne — Intégration Planity ou Fresha",
      "Réalisations — Galerie avant/après par type de coupe",
      "Le Salon — Adresse, horaires, équipe stylistes"
    ],
    cta_principal: "Réserver maintenant",
    cta_secondaire: "Voir les tarifs",
    hero_format: "Collage réalisations premium + nom du salon + bouton réservation en ligne",
    sections_obligatoires: ["Tarifs visibles", "Photos avant/après", "Avis clients", "Système réservation en ligne"],
    fonctionnalites_cles: ["Intégration Planity/Fresha", "Galerie réalisations (Instagram feed)", "Tarifs complets en ligne", "Click-to-call mobile"],
    style_recommande: "Moderne et tendance — noir/blanc ou couleurs signature du salon, Montserrat",
    conversion_mechanic: "Cliente voit réalisations → tarifs clairs → réserve sans téléphoner"
  },
  artisan: {
    pages: [
      "Accueil — Expertise + zone d'intervention + devis rapide",
      "Nos Réalisations — Portfolio photos chantiers avec descriptions",
      "Nos Services — Liste détaillée avec certifications (RGE, Qualibat)",
      "Demander un Devis — Formulaire 3 champs + réponse sous 24h",
      "Zone & Contact — Carte d'intervention + téléphone click-to-call"
    ],
    cta_principal: "Devis gratuit en 24h",
    cta_secondaire: "Voir nos réalisations",
    hero_format: "Photo chantier réel + titre métier + ville + bouton devis gratuit",
    sections_obligatoires: ["Certifications visibles (RGE, Qualibat)", "Zone d'intervention carte", "Numéro click-to-call", "Portfolio réalisations"],
    fonctionnalites_cles: ["Formulaire devis 3 champs (nom, type travaux, code postal)", "Portfolio avant/après", "Zone d'intervention interactive", "Numéro click-to-call"],
    style_recommande: "Solide et professionnel — couleurs métier, Inter ou Roboto, photos authentiques",
    conversion_mechanic: "Propriétaire cherche artisan → voit certifications + réalisations → demande devis en 30s"
  },
  medecin: {
    pages: [
      "Accueil — Spécialité claire + prise de RDV immédiate",
      "Informations Pratiques — Horaires, adresse, téléconsultation, secteur",
      "Prendre RDV — Bouton Doctolib ou formulaire direct",
      "Le Praticien — Parcours, spécialisations, langues parlées",
      "Infos Patients — FAQ, documents à apporter, remboursements"
    ],
    cta_principal: "Prendre rendez-vous",
    cta_secondaire: "Téléconsultation",
    hero_format: "Photo professionnelle du praticien + spécialité + bouton Doctolib ou RDV",
    sections_obligatoires: ["Secteur conventionnement visible", "Horaires complets", "Bouton Doctolib proéminent", "Spécialité lisible en 3s"],
    fonctionnalites_cles: ["Intégration Doctolib", "Carte accès", "Formulaire urgences", "FAQ patients"],
    style_recommande: "Rassurant et propre — blanc/vert clair, Nunito ou Lato, espaces aérés",
    conversion_mechanic: "Nouveau patient trouve le praticien → voit spécialité + secteur → prend RDV Doctolib"
  },
  immobilier: {
    pages: [
      "Accueil — Expertise locale + estimation immédiate en ligne",
      "Nos Biens — Catalogue filtrable par type/prix/secteur",
      "Vendre — Processus vente + estimation gratuite en 2 min",
      "L'Agence — Équipe, transactions réalisées, secteurs couverts",
      "Contact & Alertes — Formulaire + inscription alertes email"
    ],
    cta_principal: "Estimer mon bien",
    cta_secondaire: "Voir les biens",
    hero_format: "Photo quartier + titre expertise locale + deux CTAs (estimer/voir biens)",
    sections_obligatoires: ["Nombre de transactions réalisées", "Secteurs couverts", "Témoignages vendeurs/acheteurs", "Outil estimation en ligne"],
    fonctionnalites_cles: ["Catalogue biens filtrable", "Estimation en ligne", "Alertes email nouveaux biens", "Formulaire vendeur qualifié"],
    style_recommande: "Premium et local — couleurs agence, photos quartiers HD, Georgia ou Libre Baskerville",
    conversion_mechanic: "Vendeur arrive → estime son bien en 2 min → laisse ses coordonnées → lead qualifié"
  },
  default: {
    pages: [
      "Accueil — Proposition de valeur claire + CTA immédiat",
      "Services — Détail de l'offre avec bénéfices concrets",
      "Réalisations — Preuves sociales, cas clients, témoignages",
      "À Propos — Équipe, histoire, valeurs, différenciateurs",
      "Contact — Formulaire court + téléphone + adresse"
    ],
    cta_principal: "Demander un devis gratuit",
    cta_secondaire: "Voir nos réalisations",
    hero_format: "Visuel métier + proposition de valeur en 8 mots + CTA visible sans scroll",
    sections_obligatoires: ["Proposition de valeur claire", "Preuves sociales", "CTA visible", "Coordonnées accessibles"],
    fonctionnalites_cles: ["Formulaire contact court (3 champs)", "Téléphone click-to-call", "Témoignages clients", "Section À propos humaine"],
    style_recommande: "Professionnel et lisible — couleurs secteur, typographie moderne, photos réelles",
    conversion_mechanic: "Visiteur comprend l'offre en 5s → voit preuves → contacte en 2 clics"
  }
};

function getSectorTemplate(sector: string) {
  const key = Object.keys(SECTOR_TEMPLATES).find(k =>
    sector.toLowerCase().includes(k)
  ) || 'default';
  return { key, ...SECTOR_TEMPLATES[key] };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────
const FEW_SHOT_ARCHITECTE = `
=== EXEMPLE — Restaurant gastronomique à Lyon ===
{
  "proposition_valeur": "La gastronomie lyonnaise dans toute sa splendeur — réservez votre table en 2 clics",
  "arborescence": [
    "Accueil — Plat signature HD + 'Réserver une table' en hero",
    "Carte & Menus — Menus dégustation + carte saisonnière avec photos HD",
    "Réserver — Calendrier en ligne + confirmation SMS automatique",
    "L'Adresse — Chef, histoire du lieu, cave à vins, événements privés",
    "Infos — Horaires, accès TCL/parking, contact groupe"
  ],
  "wireframe": {
    "hero": "Photo plat signature plein écran (1920px) + overlay dégradé noir bas → texte blanc → 'Restaurant gastronomique · Lyon 6e depuis 1998' + bouton rouge 'Réserver une table' centré + note Google '4.8★ (247 avis)' en bas",
    "section_2": "Grille 3 colonnes : photos carrées des 3 plats signature + nom + prix + bouton 'Voir la carte complète'",
    "section_3": "Bandeau fond sombre : '12 tables disponibles ce soir' + calendrier inline semaine + bouton CTA",
    "section_4": "Photo chef en cuisine (portrait) + texte 2 colonnes : histoire du restaurant + citation du chef",
    "section_5": "Footer : horaires Lun–Dim, adresse cliquable Maps, Instagram feed 6 photos, copyright"
  },
  "sections_cles": ["Hero plat HD + réservation", "Carte interactive", "Calendrier disponibilités", "Histoire du chef", "Avis Google intégrés"],
  "cta": "Réserver une table",
  "style_visuel": "Gastronomique premium — fond crème/noir, Playfair Display pour les titres, photos culinaires HD obligatoires, palette or/bordeaux",
  "conversion_funnel": "Arrivée → Photo appétissante (3s) → Voir la carte (10s) → Réserver (30s) → Confirmation SMS"
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTEUR DU PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function buildArchitectePrompt(auditData: any, sector: string, city: string, brainInstructions?: string, previousIssues?: string[], approvedStrategy?: any): string {
  const template = getSectorTemplate(sector);

  // Extraire les points clés de l'audit pour personnaliser
  const piliers = auditData.analyse_piliers || {};
  const scoreGlobal = auditData.score_global || 0;
  const sitemapActuel = auditData.sitemap_actuel || [];
  const sitemapCible = auditData.sitemap_cible || [];
  const verdictRefonte = auditData.verdict_refonte || 'REFONTE TOTALE';
  const opportunite = auditData.opportunite_majeure || '';

  // Problèmes principaux détectés
  const problems = [
    piliers.presence?.observation,
    piliers.esthetique?.observation,
    piliers.parcours_ux?.observation,
    piliers.visibilite_performance?.observation
  ].filter(Boolean).map(obs => obs.slice(0, 150));

  return `Tu es l'Architecte de GhostNeural — expert en conception de sites web à haute conversion pour TPE/PME françaises.
Tu conçois des structures de sites qui transforment des visiteurs en clients.

=== AUDIT DU SITE ACTUEL ===
Secteur : ${sector}
Ville : ${city}
Score actuel : ${scoreGlobal}/100
Verdict : ${verdictRefonte}
Opportunité identifiée : ${opportunite}

Problèmes à résoudre (par priorité) :
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Structure actuelle du site (pages existantes) :
${sitemapActuel.length > 0 ? sitemapActuel.slice(0, 8).join(' | ') : 'Non détectée'}

Structure cible proposée par l'audit :
${sitemapCible.length > 0 ? sitemapCible.join('\n') : 'À définir'}

=== TEMPLATE DE BASE POUR CE SECTEUR (${sector.toUpperCase()}) ===
Pages recommandées :
${template.pages.map((p, i) => `${i + 1}. ${p}`).join('\n')}

CTA principal secteur : "${template.cta_principal}"
CTA secondaire : "${template.cta_secondaire}"
Format hero recommandé : ${template.hero_format}
Sections obligatoires : ${template.sections_obligatoires.join(', ')}
Fonctionnalités clés : ${template.fonctionnalites_cles.join(', ')}
Style recommandé : ${template.style_recommande}
Mécanique de conversion : ${template.conversion_mechanic}

=== INSTRUCTIONS DU BRAIN (ORCHESTRATEUR) ===
${brainInstructions ? `DIRECTIVES PRÉCISES : ${brainInstructions}` : 'Pas de directives spécifiques.'}

${approvedStrategy ? `=== STRATÉGIE APPROUVÉE (DÉCIDÉE PAR LE STRATÈGE) ===
Angle : ${approvedStrategy.angle_approche}
Friction : ${approvedStrategy.point_friction_majeur}
Solution : ${approvedStrategy.solution_strategique}
Instructions additionnelles : ${JSON.stringify(approvedStrategy.buyer_persona)}` : ''}

${previousIssues && previousIssues.length > 0 ? `=== ALERTES / RETOURS SUR LA VERSION PRÉCÉDENTE (RETRY) ===
Le Brain a rejeté ta version précédente pour les raisons suivantes :
${previousIssues.map(i => `- ${i}`).join('\n')}
Tu DOIS corriger ces points impérativement.` : ''}

=== EXEMPLE D'OUTPUT ATTENDU ===
${FEW_SHOT_ARCHITECTE}

=== TA MISSION ===
Conçois la structure du NOUVEAU site pour ${sector} à ${city} qui :
1. Résout CHACUN des problèmes listés ci-dessus
2. S'adapte au template sectoriel (ne sors pas des standards du secteur)
3. Maximise la conversion avec une mécanique claire visiteur → client
4. Propose un wireframe section par section (pas vague — décris précisément chaque section)
5. Suis RIGOUREUSEMENT les instructions du Brain ci-dessus pour la structure.

RÈGLES ABSOLUES :
- La proposition_valeur doit mentionner le secteur ET la ville — jamais générique
- Le CTA doit être spécifique au secteur (pas "Contactez-nous")  
- Le wireframe doit décrire hero + 3 sections minimum avec contenu exact
- Style_visuel = polices spécifiques + palette couleurs + ambiance

RÉPONDS UNIQUEMENT EN JSON :
{
  "proposition_valeur": "<Accroche principale du site — mentionne secteur + ville — max 12 mots>",
  "arborescence": [
    "<Page 1 — titre + objectif de conversion>",
    "<Page 2>",
    "<Page 3>",
    "<Page 4>",
    "<Page 5>"
  ],
  "wireframe": {
    "hero": "<Description précise : visuel + texte + CTA + éléments de preuve>",
    "section_2": "<Description>",
    "section_3": "<Description>",
    "section_4": "<Description (si pertinent)>"
  },
  "sections_cles": ["<Section 1>", "<Section 2>", "<Section 3>", "<Section 4>"],
  "cta": "<Le CTA principal — spécifique au secteur>",
  "style_visuel": "<Polices + palette couleurs + ambiance — précis>",
  "conversion_funnel": "<Parcours visiteur → client en 4 étapes chronométrées>"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function runArchitecteAgent(auditData: any, sector: string, city: string, brainInstructions?: string, previousIssues?: string[], approvedStrategy?: any) {
  const template = getSectorTemplate(sector);

  try {
    const prompt = buildArchitectePrompt(auditData, sector, city, brainInstructions, previousIssues, approvedStrategy);

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307", // Haiku — templates sectoriels compensent
        max_tokens: 1500,
        temperature: 0.4, // Un peu de créativité pour la proposition de valeur
        system: `Tu es l'Architecte de GhostNeural. Tu conçois des structures de sites web pour TPE/PME françaises.
Tu réponds UNIQUEMENT en JSON valide. Jamais de texte en dehors du JSON.
Chaque output est spécifique au secteur et à la ville — jamais générique.
Le wireframe doit être actionnable par un développeur — descriptions précises obligatoires.`,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Échec Architecte — réponse vide");

    const cleaned = typeof result === 'string'
      ? result.replace(/```json|```/g, '').trim()
      : JSON.stringify(result);

    const json = extractJsonSafe(cleaned) || JSON.parse(cleaned);

    // Validation — si la proposition de valeur est trop générique, on la reconstruit
    const propVal = json.proposition_valeur || '';
    const isGeneric = !propVal.toLowerCase().includes(city.toLowerCase()) &&
                      !propVal.toLowerCase().includes(sector.toLowerCase());
    if (isGeneric && city) {
      json.proposition_valeur = `${propVal} — ${sector} à ${city}`;
    }

    return {
      // Compatibilité UI existante
      arborescence:      json.arborescence      || template.pages,
      wireframe:         json.wireframe          || { hero: template.hero_format },
      sections_cles:     json.sections_cles      || template.sections_obligatoires,
      proposition_valeur: json.proposition_valeur || `${sector} premium à ${city}`,
      cta:               json.cta                || template.cta_principal,
      style_visuel:      json.style_visuel        || template.style_recommande,
      // Champs enrichis
      conversion_funnel: json.conversion_funnel  || template.conversion_mechanic,
      fonctionnalites:   template.fonctionnalites_cles,
      sector_template:   template.key,
    };

  } catch (error) {
    console.error("⚠️ Erreur Architecte:", error);

    // Fallback sectoriel — jamais de données GhostNeural auto-référentielles
    return {
      arborescence:      template.pages,
      wireframe:         { hero: template.hero_format, section_2: template.sections_obligatoires[0] },
      sections_cles:     template.sections_obligatoires,
      proposition_valeur: `${sector} de qualité à ${city} — contactez-nous`,
      cta:               template.cta_principal,
      style_visuel:      template.style_recommande,
      conversion_funnel: template.conversion_mechanic,
      fonctionnalites:   template.fonctionnalites_cles,
      sector_template:   'default',
    };
  }
}

// Export des prompts pour compatibilité avec les imports existants
export const ARCHI_SYSTEM_PROMPT = `Tu es l'Architecte de GhostNeural. Tu conçois des structures de sites web pour TPE/PME françaises. Tu réponds UNIQUEMENT en JSON valide.`;
export const ARCHI_USER_PROMPT_TEMPLATE = (secteur: string, ville: string, audit: any, brainInstructions?: string, previousIssues?: string[], approvedStrategy?: any) =>
  buildArchitectePrompt(audit, secteur, ville, brainInstructions, previousIssues, approvedStrategy);
