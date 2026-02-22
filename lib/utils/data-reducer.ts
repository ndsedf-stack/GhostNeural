/**
 * DataReducer — GHOSTNEURAL V2
 * 
 * Rôle : Transformer le vrac de scan (Lighthouse, DOM, HTML) en 
 * un objet JSON compact, structuré et "LLM-ready" (< 5k tokens).
 * 
 * Inclut également les calculs business déterministes (Anti-Hallucination).
 */

export interface ReducedAuditInput {
  business: BusinessContext;
  technical: TechnicalSignals;
  ux: UXSignals;
  content: ContentSignals;
  benchmarks: SectorBenchmarks;
  computed: ComputedBusinessSignals;
}

interface BusinessContext {
  secteur: string;
  ville: string;
  domaine: string;
  nb_pages: number;
}

interface TechnicalSignals {
  performance_score: number;
  seo_score: number;
  accessibility_score: number;
  lcp: number;
  cls: number;
  tbt: number;
  mobile_friendly: boolean;
  schema_local_present: boolean;
}

interface UXSignals {
  cta_present: boolean;
  cta_position: "above_fold" | "middle" | "footer_only" | "absent";
  hero_section_present: boolean;
  phone_clickable_mobile: boolean;
  nav_clarity_score: number; // 0-100
  trust_elements_count: number;
}

interface ContentSignals {
  h1: string;
  meta_title: string;
  meta_description: string;
  word_count: number;
  ville_in_content: boolean;
  services_listed: string[];
  duplicate_titles: boolean;
}

export interface SectorBenchmarks {
  lcp_target: number;
  perf_target: number;
  typical_pages: number;
  cta_expected: string;
  trust_signals: string[];
  killer_features: string[];
  competitor_standard: string;
}

interface ComputedBusinessSignals {
  estimated_monthly_visitors: number;
  estimated_conversion_rate_current: number;
  estimated_conversion_rate_potential: number;
  estimated_lost_revenue_range: {
    min: number;
    max: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS SECTORIELS (Source de vérité unique)
// ─────────────────────────────────────────────────────────────────────────────
export const SECTOR_BENCHMARKS: Record<string, SectorBenchmarks> = {
  restaurant: {
    lcp_target: 2.0,
    perf_target: 75,
    typical_pages: 5,
    cta_expected: "Réserver / Voir le menu",
    trust_signals: ["Note Google visible", "Photos HD des plats", "Horaires clairs", "Adresse avec Maps embed"],
    killer_features: ["Menu en ligne (pas PDF)", "Réservation en 2 clics", "Galerie plats HD", "Avis Google intégrés"],
    competitor_standard: "Les restaurants concurrents bien référencés ont un LCP < 2s, un menu interactif et un bouton de réservation visible sans scroller."
  },
  avocat: {
    lcp_target: 2.5,
    perf_target: 70,
    typical_pages: 6,
    cta_expected: "Consultation gratuite / Prendre RDV",
    trust_signals: ["Barreau d'appartenance", "Spécialisations lisibles", "Cas résolus / témoignages", "Photo professionnelle"],
    killer_features: ["Formulaire de contact qualifié", "FAQ juridique", "Page par domaine de droit", "Calendly ou RDV en ligne"],
    competitor_standard: "Les cabinets concurrents affichent leurs spécialisations en 3 secondes, une photo professionnelle du cabinet et un formulaire de prise de contact simplifié."
  },
  coiffeur: {
    lcp_target: 2.0,
    perf_target: 72,
    typical_pages: 4,
    cta_expected: "Prendre RDV en ligne",
    trust_signals: ["Photos avant/après", "Tarifs visibles", "Avis clients", "Localisation"],
    killer_features: ["Réservation en ligne (Planity/Fresha)", "Galerie réalisations", "Tarifs complets", "Instagram feed"],
    competitor_standard: "Les salons concurrents ont tous intégré un système de réservation en ligne — les clients s'attendent à réserver sans téléphoner."
  },
  artisan: {
    lcp_target: 2.5,
    perf_target: 65,
    typical_pages: 5,
    cta_expected: "Devis gratuit / Appeler",
    trust_signals: ["Certifications (RGE, Qualibat)", "Photos chantiers réalisés", "Zone d'intervention", "Témoignages clients"],
    killer_features: ["Formulaire devis simplifié", "Portfolio réalisations", "Zone d'intervention carte", "Numéro click-to-call"],
    competitor_standard: "Les artisans qui génèrent des leads en ligne affichent leurs certifications, une galerie de réalisations et un formulaire devis en 3 champs max."
  },
  medecin: {
    lcp_target: 2.0,
    perf_target: 75,
    typical_pages: 4,
    cta_expected: "Prendre RDV / Doctolib",
    trust_signals: ["Spécialité lisible", "RPPS/Numéro professionnel", "Horaires et téléconsultation", "Secteur conventionnement"],
    killer_features: ["Intégration Doctolib", "Carte d'accès", "Informations pratiques claires", "Langues parlées"],
    competitor_standard: "Les praticiens référencés ont systématiquement un bouton Doctolib visible en haut de page et leurs informations pratiques accessibles en moins de 2 clics."
  },
  immobilier: {
    lcp_target: 2.5,
    perf_target: 70,
    typical_pages: 6,
    cta_expected: "Estimer mon bien / Voir les biens",
    trust_signals: ["Transactions réalisées", "Avis Google", "Zones couvertes", "Photo équipe"],
    killer_features: ["Moteur de recherche biens", "Estimation en ligne", "Alertes email", "Visite virtuelle"],
    competitor_standard: "Les agences immobilières concurrentes proposent un outil d'estimation en ligne et un catalogue de biens filtrable — sans ça, le prospect part sur SeLoger."
  },
  default: {
    lcp_target: 2.5,
    perf_target: 70,
    typical_pages: 5,
    cta_expected: "Contact / Devis / RDV",
    trust_signals: ["Coordonnées visibles", "Preuve sociale", "Offre claire", "Photo réelle"],
    killer_features: ["CTA visible sans scroller", "Formulaire de contact court", "Témoignages clients", "Page À propos humaine"],
    competitor_standard: "Les leaders de ce secteur ont un site mobile-first, un CTA visible immédiatement et au moins 10 avis Google récents linkés."
  }
};

export function getSectorBenchmark(sector: string): SectorBenchmarks {
  const key = Object.keys(SECTOR_BENCHMARKS).find(k =>
    sector.toLowerCase().includes(k)
  ) || 'default';
  return SECTOR_BENCHMARKS[key];
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA REDUCER — Point d'entrée principal
// ─────────────────────────────────────────────────────────────────────────────

export async function dataReducer(
    scanResult: any, 
    lh: any, 
    secteur: string, 
    ville: string
): Promise<ReducedAuditInput> {
  
  const business: BusinessContext = {
    secteur,
    ville,
    domaine: new URL(scanResult.url || scanResult.site_web || "http://unknown.com").hostname,
    nb_pages: scanResult.inner_links?.length || 1
  };

  const technical: TechnicalSignals = {
    performance_score: (lh?.performanceScore || 50),
    seo_score: (lh?.seoScore || 60),
    accessibility_score: (lh?.accessibilityScore || 70),
    lcp: lh?.lcp || 2.5,
    cls: lh?.cls || 0.1,
    tbt: lh?.tbt || 300,
    mobile_friendly: (lh?.performanceScore || 50) > 40,
    schema_local_present: lh?.raw?.audits?.['structured-data']?.score === 1 || !!scanResult.html_sample?.includes('schema.org')
  };

  const ux: UXSignals = {
    cta_present: (scanResult.cta_count || 0) > 0,
    cta_position: (scanResult.cta_count || 0) > 0 ? "above_fold" : "absent", // Heuristique simple pour l'instant
    hero_section_present: !!scanResult.h1 && scanResult.h1 !== "Manquant",
    phone_clickable_mobile: !!scanResult.phone_visible,
    nav_clarity_score: scanResult.inner_links?.length > 15 ? 40 : 80, // Trop de liens = bordel
    trust_elements_count: (scanResult.avis_clients ? 1 : 0) + (scanResult.mentions_legales_presentes ? 1 : 0)
  };

  const content: ContentSignals = {
    h1: scanResult.h1 || "Manquant",
    meta_title: scanResult.meta_title || "",
    meta_description: scanResult.meta_description || "",
    word_count: (scanResult.html_sample?.split(/\s+/)?.length || 0),
    ville_in_content: !!ville && scanResult.html_sample?.toLowerCase()?.includes(ville.toLowerCase()),
    services_listed: [], // À enrichir si possible
    duplicate_titles: false
  };

  const benchmarks = getSectorBenchmark(secteur);
  const computed = computeBusinessImpact({ business, technical, ux, content, benchmarks });

  return {
    business,
    technical,
    ux,
    content,
    benchmarks,
    computed
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULS BUSINESS DÉTERMINISTES (Anti-Hallucination)
// ─────────────────────────────────────────────────────────────────────────────

interface CalculationContext {
  business: BusinessContext;
  technical: TechnicalSignals;
  ux: UXSignals;
  content: ContentSignals;
  benchmarks: SectorBenchmarks;
}

const SECTOR_METRICS: Record<string, { tauxConv: number; panier: number }> = {
  restaurant: { tauxConv: 0.03, panier: 45 },
  avocat: { tauxConv: 0.02, panier: 800 },
  artisan: { tauxConv: 0.025, panier: 1200 },
  immobilier: { tauxConv: 0.015, panier: 6000 },
  medecin: { tauxConv: 0.04, panier: 50 },
  coiffeur: { tauxConv: 0.035, panier: 60 },
  default: { tauxConv: 0.02, panier: 200 }
};

function computeBusinessImpact(ctx: CalculationContext): ComputedBusinessSignals {
  const s = Object.keys(SECTOR_METRICS).find(k => ctx.business.secteur.toLowerCase().includes(k)) || "default";
  const { tauxConv, panier } = SECTOR_METRICS[s];

  // Estimation trafic mensuel (basé sur SEO et performance)
  const visitors =
    ctx.technical.seo_score < 40 ? 100 :
    ctx.technical.seo_score < 60 ? 300 :
    ctx.technical.seo_score < 80 ? 1000 : 3000;

  // Calcul pertes (LCP > 2.5s coûte ~25% de conversion, pas de CTA coûte ~40%)
  const pertePerf = ctx.technical.lcp > 2.5 ? 0.25 : 0.1;
  const perteUx = ctx.ux.cta_present ? 0.1 : 0.4;
  
  const currentConv = tauxConv * (1 - (pertePerf + perteUx));
  const potentialConv = tauxConv * 1.2; // Bonus de conversion avec un site optimisé GhostNeural

  const lostVisitors = visitors * (pertePerf + perteUx);
  const lostRevenue = lostVisitors * tauxConv * panier;

  return {
    estimated_monthly_visitors: visitors,
    estimated_conversion_rate_current: currentConv,
    estimated_conversion_rate_potential: potentialConv,
    estimated_lost_revenue_range: {
      min: Math.round(lostRevenue * 0.7),
      max: Math.round(lostRevenue * 1.3)
    }
  };
}
