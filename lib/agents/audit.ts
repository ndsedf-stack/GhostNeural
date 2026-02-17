import { gemini } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS SECTORIELS EMBARQUÉS
// Référentiel interne GhostNeural — mis à jour trimestriellement
// ─────────────────────────────────────────────────────────────────────────────
const SECTOR_BENCHMARKS: Record<string, {
  lcp_target: number;
  perf_target: number;
  typical_pages: number;
  cta_expected: string;
  trust_signals: string[];
  killer_features: string[];
  competitor_standard: string;
}> = {
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

function getSectorBenchmark(sector: string) {
  const key = Object.keys(SECTOR_BENCHMARKS).find(k =>
    sector.toLowerCase().includes(k)
  ) || 'default';
  return SECTOR_BENCHMARKS[key];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES — ce que l'agent doit produire (exemples réels)
// Ces exemples calibrent la qualité et la précision des observations
// ─────────────────────────────────────────────────────────────────────────────
const FEW_SHOT_EXAMPLES = `
=== EXEMPLE 1 — Restaurant gastronomique (Score: 28/100) ===
INPUT: H1="Bienvenue chez Chez Marcel", polices=["Arial", "Times New Roman"], LCP=8.2s, CTA=0, 3 pages détectées

OUTPUT ATTENDU:
{
  "analyse_piliers": {
    "presence": {
      "score": 3,
      "observation": "Le site n'affiche aucune note Google, aucune adresse cliquable et aucun horaire visible en homepage. Un visiteur qui arrive sur mobile ne sait pas si le restaurant est ouvert aujourd'hui. Le H1 'Bienvenue chez Marcel' ne communique aucune valeur — un concurrent qui affiche 'Restaurant gastronomique français — Cannes, depuis 1998' capte immédiatement la confiance."
    },
    "esthetique": {
      "score": 2,
      "observation": "Les polices Arial + Times New Roman sont les polices système par défaut de Windows 2003. Elles signalent au visiteur que le site n'a jamais été pensé visuellement. Aucune cohérence couleur détectée (fond blanc, texte noir, liens bleus par défaut). Par comparaison, les restaurants étoilés de la région utilisent des typographies premium (Playfair Display, Cormorant) qui renforcent l'image haut de gamme. Ce décalage détruit la perception de qualité avant même la lecture du menu."
    },
    "parcours_ux": {
      "score": 1,
      "observation": "0 CTA détecté sur la page d'accueil. Un visiteur motivé qui veut réserver doit chercher lui-même un numéro de téléphone ou un email. Sur mobile, cette friction coûte 70% des conversions potentielles. La structure actuelle en 3 pages (Accueil / Menu PDF / Contact) oblige 3 clics minimum pour accéder aux informations essentielles — les standards actuels exigent une réservation accessible en 1 clic depuis le hero."
    },
    "visibilite_performance": {
      "score": 2,
      "observation": "LCP de 8.2 secondes — Google considère comme 'pauvre' tout LCP > 4s. À 8.2s, 53% des visiteurs mobiles ont déjà quitté la page (donnée Google, 2023). Le menu est un fichier PDF non indexable — Google ne peut pas lire le contenu, donc impossible de ranker sur 'restaurant gastronomique Cannes'. Pas de sitemap.xml = Google découvre le site par hasard."
    }
  },
  "verdict_strategique": "Ce restaurant sert une cuisine à 80€/couvert avec un site qui ressemble à une page MySpace 2006. Le décalage entre la qualité perçue en salle et la crédibilité digitale coûte entre 15 et 25 couverts par semaine en réservations perdues — soit 6 000 à 10 000€/mois de CA non capté.",
  "opportunite_majeure": "Refonte mobile-first avec réservation en 1 clic, menu interactif HD et intégration des 200 avis Google : potentiel de +40% de réservations en ligne dans les 3 premiers mois.",
  "score_global": 28
}

=== EXEMPLE 2 — Cabinet d'avocats (Score: 45/100) ===
INPUT: H1="Cabinet Dupont & Associés", polices=["Georgia", "Verdana"], LCP=4.1s, CTA=2, 8 pages détectées

OUTPUT ATTENDU:
{
  "analyse_piliers": {
    "presence": {
      "score": 5,
      "observation": "Le cabinet affiche son nom et ses domaines de spécialité, mais aucune indication du barreau d'appartenance n'est visible en homepage. Pour un visiteur en situation d'urgence juridique, l'absence de preuve de légitimité immédiate (numéro RPPS, barreau, années d'exercice) génère un doute qui pousse vers la concurrence. 2 CTAs détectés mais positionnés en bas de page — invisibles sans scroll sur mobile."
    },
    "esthetique": {
      "score": 5,
      "observation": "Georgia + Verdana sont des polices web des années 2000, correctes en lisibilité mais sans prestance. Pour un cabinet facturant 300€/heure, l'image visuelle doit refléter ce positionnement premium. Les cabinets concurrents bien référencés utilisent des identités visuelles structurées (Cormorant + Source Sans Pro, palette bleu marine/or) qui communiquent instantanément sérieux et expertise."
    },
    "parcours_ux": {
      "score": 4,
      "observation": "8 pages détectées dont 3 semblent être des sous-pages de domaines juridiques sans hiérarchie claire. Un visiteur cherchant 'avocat divorce Paris' arrive sur la homepage et ne sait pas en 5 secondes si le cabinet traite son cas. La règle des 5 secondes est violée : l'offre n'est pas compréhensible immédiatement. Pas de formulaire de qualification de cas — le prospect doit appeler sans savoir si le cabinet peut l'aider."
    },
    "visibilite_performance": {
      "score": 5,
      "observation": "LCP 4.1s — dans la zone 'À améliorer' selon Google Core Web Vitals (seuil: 2.5s). Pour un cabinet ciblant des mots-clés compétitifs ('avocat Paris droit des affaires'), ce score de performance pénalise le ranking. Sitemap présent mais meta descriptions génériques — impossible de se différencier dans les SERPs."
    }
  },
  "verdict_strategique": "Le cabinet a les compétences mais pas la vitrine digitale qui les reflète. Dans un marché où 67% des recherches d'avocats commencent sur Google, un site qui ne convertit pas en 5 secondes laisse le champ libre aux LegalTech et aux cabinets concurrents qui ont investi leur image digitale.",
  "opportunite_majeure": "Refonte avec landing pages par domaine juridique, formulaire de qualification de cas en 3 questions et page 'Nos résultats' avec cas anonymisés : potentiel de tripler les prises de contact qualifiées.",
  "score_global": 45
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT SYSTÈME — Rôle et règles absolues
// ─────────────────────────────────────────────────────────────────────────────
export const AUDIT_SYSTEM_PROMPT = `Tu es un consultant senior en UX, conversion web et stratégie digitale chez GhostNeural.
Tu as 12 ans d'expérience en refonte de sites web pour TPE/PME françaises.
Tu as audité +800 sites et vendu +500 projets de refonte entre 1 500€ et 5 000€.

TES RÈGLES ABSOLUES :
1. Chaque observation DOIT contenir : le problème exact + une preuve tirée des données + l'impact business estimé.
2. Jamais d'observation vague. "Design obsolète" est inacceptable. "Polices Arial + Times New Roman (standard Windows 2003) vs concurrents utilisant Playfair Display — signal visuel qui détruit la perception premium" est correct.
3. Compare TOUJOURS avec le standard du secteur — le prospect doit se voir inférieur à ses concurrents, pas juste "mauvais".
4. Chiffre TOUJOURS l'impact : "coûte X% de conversions", "perd N€/mois estimés", "53% des visiteurs partent avant 4s".
5. Réponds UNIQUEMENT en JSON strict et valide. Zéro texte en dehors du JSON.
6. Le score_global est la moyenne pondérée des 4 piliers : présence (25%) + esthétique (20%) + UX (30%) + performance (25%).`;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTEUR DU PROMPT UTILISATEUR
// ─────────────────────────────────────────────────────────────────────────────
function buildAuditPrompt(scannedData: any, lighthouse: any, sector: string): string {
  const benchmark = getSectorBenchmark(sector);

  const lcpStatus = lighthouse.lcp > 4
    ? `CRITIQUE (${lighthouse.lcp}s — Google considère > 4s comme "pauvre", seuil standard ${sector}: ${benchmark.lcp_target}s)`
    : lighthouse.lcp > 2.5
    ? `À AMÉLIORER (${lighthouse.lcp}s — seuil "bon" Google: 2.5s)`
    : `BON (${lighthouse.lcp}s)`;

  const perfStatus = lighthouse.performanceScore < 50
    ? `CATASTROPHIQUE (${lighthouse.performanceScore}/100 — standard secteur ${sector}: ${benchmark.perf_target}/100)`
    : lighthouse.performanceScore < benchmark.perf_target
    ? `INSUFFISANT (${lighthouse.performanceScore}/100 — standard secteur: ${benchmark.perf_target}/100)`
    : `CORRECT (${lighthouse.performanceScore}/100)`;

  const ctaVerdict = scannedData.cta_count === 0
    ? `AUCUN CTA (catastrophique — le visiteur ne sait pas quoi faire)`
    : scannedData.cta_count < 2
    ? `${scannedData.cta_count} CTA (insuffisant — standard: 2 minimum visibles sans scroll)`
    : `${scannedData.cta_count} CTAs détectés`;

  const pagesVerdict = scannedData.inner_links?.length < 3
    ? `${scannedData.inner_links?.length || 0} pages (trop peu — structure squelettique)`
    : `${scannedData.inner_links?.length || 0} pages détectées`;

  // Texte brut de la page — tronqué à 1200 chars pour garder le coût bas
  const bodyText = scannedData.body_text
    ? scannedData.body_text.replace(/\s+/g, ' ').trim().slice(0, 1200)
    : scannedData.html
    ? scannedData.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200)
    : null;

  // Données visiteurs / engagement si disponibles
  const visitorData = scannedData.analytics ? `
[DONNÉES VISITEURS & ENGAGEMENT]
- Visiteurs/mois estimés : ${scannedData.analytics.monthly_visitors || 'Non disponible'}
- Taux de rebond : ${scannedData.analytics.bounce_rate ? scannedData.analytics.bounce_rate + '%' : 'Non disponible'} ${scannedData.analytics.bounce_rate > 70 ? '⚠ CRITIQUE (> 70% = problème majeur de pertinence ou de vitesse)' : ''}
- Durée moyenne session : ${scannedData.analytics.avg_session_duration || 'Non disponible'} ${scannedData.analytics.avg_session_duration && scannedData.analytics.avg_session_duration < 60 ? '⚠ FAIBLE (< 60s = visiteur non engagé)' : ''}
- Pages vues / session : ${scannedData.analytics.pages_per_session || 'Non disponible'}
- Trafic mobile vs desktop : ${scannedData.analytics.mobile_pct ? scannedData.analytics.mobile_pct + '% mobile' : 'Non disponible'}
- Source de trafic principale : ${scannedData.analytics.top_source || 'Non disponible'}` : '';

  // Estimation visiteurs basée sur le score SEO si pas de données analytics
  const visitorEstimate = !scannedData.analytics ? `
[ESTIMATION TRAFIC]
- Visiteurs/mois estimés : ${
    lighthouse.performanceScore < 40
      ? 'Très faible (< 100/mois probable — site quasi-invisible sur Google)'
      : lighthouse.performanceScore < 60
      ? 'Faible (100–500/mois estimé — référencement limité)'
      : lighthouse.performanceScore < 80
      ? 'Moyen (500–2000/mois estimé)'
      : 'Correct (2000+/mois estimé)'
  }
- Note : estimation basée sur le score Lighthouse et la structure SEO. Sans sitemap ni meta descriptions optimisées, le trafic organique est structurellement limité.` : '';

  return `
=== MISSION D'AUDIT GHOSTNEURAL ===

PROSPECT À AUDITER :
- Secteur : ${sector}
- URL : ${scannedData.url || 'Non renseignée'}

=== DONNÉES TECHNIQUES EXTRAITES ===

[SEO & STRUCTURE]
- H1 : "${scannedData.h1 || 'ABSENT — problème critique'}"
- Meta Title : "${scannedData.meta_title || 'ABSENTE'}"
- Meta Description : "${scannedData.meta_description || 'ABSENTE'}"
- Sitemap.xml : ${scannedData.sitemap_present ? 'PRÉSENT ✓' : 'ABSENT ✗ (Google découvre le site par hasard)'}
- Robots.txt : ${scannedData.robots_present ? 'PRÉSENT ✓' : 'ABSENT ✗'}
- Pages détectées : ${pagesVerdict}
- URLs internes : ${scannedData.inner_links?.slice(0, 10).join(' | ') || 'Aucune'}
${visitorData}${visitorEstimate}

[DESIGN & IDENTITÉ]
- Polices détectées : ${scannedData.design_tokens?.fonts?.join(', ') || 'Non détectées'}
- Palette de couleurs : ${scannedData.design_tokens?.colors?.join(', ') || 'Non détectée'}
- CTAs : ${ctaVerdict}
- Images détectées : ${scannedData.image_count ?? 'Non compté'} ${scannedData.image_count === 0 ? '⚠ AUCUNE IMAGE (site sans visuels = crédibilité zéro)' : ''}
- Formulaires détectés : ${scannedData.form_count ?? 'Non compté'} ${scannedData.form_count === 0 ? '⚠ AUCUN FORMULAIRE (pas de capture de leads possible)' : ''}

[CONTENU RÉEL DE LA PAGE — EXTRAIT]
${bodyText
  ? `Voici le texte visible par un visiteur sur la homepage :
"""
${bodyText}
"""
Analyse ce contenu : est-il clair ? Communique-t-il la valeur en 5 secondes ? Y a-t-il des fautes, du jargon inutile, un message flou ?`
  : 'Texte brut non disponible — base-toi sur H1, meta et structure.'
}

[PERFORMANCE LIGHTHOUSE]
- Score global : ${perfStatus}
- LCP (Largest Contentful Paint) : ${lcpStatus}
- TTFB (Time to First Byte) : ${lighthouse.ttfb}ms ${lighthouse.ttfb > 600 ? '⚠ LENT (> 600ms = problème serveur)' : '✓'}
- CLS (Cumulative Layout Shift) : ${lighthouse.cls !== undefined ? (lighthouse.cls > 0.25 ? `CRITIQUE (${lighthouse.cls} — seuil "bon" Google: < 0.1)` : lighthouse.cls > 0.1 ? `À AMÉLIORER (${lighthouse.cls})` : `BON (${lighthouse.cls})`) : 'Non mesuré'}
- FID / INP : ${lighthouse.fid || lighthouse.inp || 'Non mesuré'}
- Taille de page estimée : ${lighthouse.total_byte_weight ? Math.round(lighthouse.total_byte_weight / 1024) + ' Ko' : 'Non mesuré'} ${lighthouse.total_byte_weight > 3000000 ? '⚠ TROP LOURD (> 3Mo = chargement lent sur mobile)' : ''}

=== RÉFÉRENTIEL SECTORIEL — STANDARD ${sector.toUpperCase()} ===
- Performance cible du secteur : ${benchmark.perf_target}/100
- LCP attendu : < ${benchmark.lcp_target}s
- CTA attendu : "${benchmark.cta_expected}"
- Signaux de confiance standards dans ce secteur : ${benchmark.trust_signals.join(', ')}
- Fonctionnalités clés que les concurrents ont déjà : ${benchmark.killer_features.join(', ')}
- Ce que font les leaders du secteur : ${benchmark.competitor_standard}

=== EXEMPLES D'OUTPUTS DE QUALITÉ (FEW-SHOT) ===
${FEW_SHOT_EXAMPLES}

=== TON RAPPORT D'AUDIT ===

Analyse ce prospect selon les 4 piliers. Pour chaque pilier :
- Donne un score de 0 à 10 (0 = catastrophique, 10 = excellence)
- Rédige une observation de 3 à 5 phrases minimum qui :
  a) Cite le problème exact avec preuves des données ci-dessus
  b) Compare avec le standard du secteur (utilise le référentiel fourni)
  c) Quantifie l'impact business (conversions perdues, CA estimé, % de rebond)

Pour le verdict_strategique : explique en 2-3 phrases PERCUTANTES pourquoi ce site détruit activement le CA du prospect. Sois sans pitié mais factuel. Cite des chiffres.

Pour l'estimation_impact : chiffre concrètement les visiteurs perdus/mois, le CA non capté, le taux de conversion actuel estimé vs le potentiel après refonte. Base-toi sur le secteur, le score SEO, le LCP et le nombre de CTAs. Sois réaliste mais vendeur.

Pour le sitemap_cible : propose exactement 5 pages optimisées pour la conversion dans ce secteur.

Le score_global = moyenne pondérée : (présence×0.25 + esthétique×0.20 + ux×0.30 + perf×0.25) × 10. Calcule-le précisément.

RÉPONDS UNIQUEMENT AVEC CE JSON :
{
  "analyse_piliers": {
    "presence": {
      "score": <0-10>,
      "observation": "<3-5 phrases avec preuves + impact business>"
    },
    "esthetique": {
      "score": <0-10>,
      "observation": "<3-5 phrases avec preuves + comparaison sectorielle>"
    },
    "parcours_ux": {
      "score": <0-10>,
      "observation": "<3-5 phrases avec preuves + % conversions perdues>"
    },
    "visibilite_performance": {
      "score": <0-10>,
      "observation": "<3-5 phrases avec métriques exactes + impact SEO>"
    }
  },
  "core_web_vitals": {
    "performance_score": <number repris de Lighthouse>,
    "lcp": "<valeur avec statut BON/À AMÉLIORER/CRITIQUE>",
    "cls": "<valeur ou 'Non mesuré'>",
    "ttfb": "<valeur en ms>"
  },
  "seo": {
    "h1": "<valeur extraite>",
    "meta_title": "<valeur extraite>",
    "meta_description": "<valeur extraite ou ABSENTE>",
    "sitemap_present": <boolean>,
    "robots_txt": "<PRÉSENT ou ABSENT>"
  },
  "sitemap_cible": [
    "<Page 1 avec description de son objectif de conversion>",
    "<Page 2>",
    "<Page 3>",
    "<Page 4>",
    "<Page 5>"
  ],
  "verdict_strategique": "<2-3 phrases percutantes avec chiffres — pourquoi ce site détruit le CA>",
  "opportunite_majeure": "<La transformation concrète avec résultat estimé chiffré>",
  "score_global": <calcul pondéré précis sur 100>,
  "estimation_impact": {
    "visiteurs_perdus_par_mois": "<estimation chiffrée basée sur le score SEO et la performance>",
    "ca_non_capte_estime": "<fourchette en € / mois — basée sur le secteur et le trafic estimé>",
    "taux_conversion_actuel_estime": "<% estimé selon les CTAs et la structure>",
    "taux_conversion_potentiel": "<% atteignable après refonte>"
  }
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function runUltraAudit(scannedData: any, lighthouse: any, sector: string) {
  const model = gemini.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      temperature: 0.3,      // Précision > créativité pour un audit
      maxOutputTokens: 4096, // Observations longues — 2048 était trop juste
    },
    systemInstruction: {
      role: "system",
      parts: [{ text: AUDIT_SYSTEM_PROMPT }]
    },
  });

  const prompt = buildAuditPrompt(scannedData, lighthouse, sector);

  try {
    // Préparation des données multimodales (Images + Texte)
    const contentParts: any[] = [{ text: prompt }];
    
    if (scannedData.screenshot_desktop?.includes('base64,')) {
      contentParts.push({
        inlineData: {
          data: scannedData.screenshot_desktop.split('base64,')[1],
          mimeType: "image/jpeg"
        }
      });
    }
    
    if (scannedData.screenshot_mobile?.includes('base64,')) {
      contentParts.push({
        inlineData: {
          data: scannedData.screenshot_mobile.split('base64,')[1],
          mimeType: "image/jpeg"
        }
      });
    }

    const result = await model.generateContent(contentParts);
    const rawText = result.response.text();
    console.log("[Ultra Audit] Raw Response:", rawText); // DEBUG
    const json = extractJsonSafe(rawText);

    if (!json || typeof json.score_global !== 'number') {
      console.error("[Ultra Audit] JSON invalide ou incomplet. Raw JSON sample:", rawText.slice(0, 500));
      if (!json) throw new Error("Could not extract valid JSON from Gemini response");
      if (typeof json.score_global !== 'number') throw new Error("Missing score_global in audit JSON");
      throw new Error("Invalid audit JSON structure");
    }

    // Calcul de score_global côté serveur si l'agent le rate
    const piliers = json.analyse_piliers;
    if (piliers) {
      const calculatedScore = Math.round(
        (piliers.presence?.score || 0) * 0.25 * 10 +
        (piliers.esthetique?.score || 0) * 0.20 * 10 +
        (piliers.parcours_ux?.score || 0) * 0.30 * 10 +
        (piliers.visibilite_performance?.score || 0) * 0.25 * 10
      );
      if (Math.abs(json.score_global - calculatedScore) > 15) {
        console.warn(`[Ultra Audit] Score corrigé: ${json.score_global} → ${calculatedScore}`);
        json.score_global = calculatedScore;
      }
    }

    return {
      ...json,
      screenshot_url: scannedData.screenshot_desktop,
      mobile_screenshot: scannedData.screenshot_mobile,
      design_tokens: scannedData.design_tokens,
      sitemap_actuel: scannedData.inner_links,
      qualification: {
        status: json.score_global < 55 ? "HIGH" : "MEDIUM",
        raison: json.opportunite_majeure
      },
      verdict_refonte: json.score_global < 50 ? "REFONTE TOTALE" : "OPTIMISATION LEGERE",
      estimation_impact: json.estimation_impact || null,
      analytics_raw: scannedData.analytics || null,
      _meta: {
        sector_benchmark_used: getSectorBenchmark(sector),
        prompt_version: "2.1",
        model: "gemini-flash-latest",
        body_text_injected: !!scannedData.body_text || !!scannedData.html,
        tokens_estimated_input: 1800,
        tokens_estimated_output: 1200,
        cost_estimated_usd: 0.0005
      }
    };

  } catch (e) {
    console.error("[Ultra Audit] Error:", e);
    return { error: "Audit failed", details: String(e) };
  }
}

/** @deprecated Use runUltraAudit */
export async function runAuditAgent(url: string, sector: string) {
  return { status: "MIGRATING" };
}
