import { anthropic, callLLMWithRetry } from '../llm-clients';

// ─────────────────────────────────────────────────────────────────────────────
// PROFILS DÉCIDEURS PAR SECTEUR
// Le Stratège doit parler à une personne réelle, pas à "un prospect"
// ─────────────────────────────────────────────────────────────────────────────
const BUYER_PERSONAS: Record<string, {
  profil: string;
  age_typique: string;
  rapport_au_digital: string;
  pain_principal: string;
  gain_desire: string;
  objection_numero_1: string;
  reponse_objection: string;
  trigger_emotionnel: string;
  angle_gagnant: string;
}> = {
  restaurant: {
    profil: "Chef-propriétaire ou gérant de salle",
    age_typique: "42–58 ans",
    rapport_au_digital: "Sceptique — a déjà payé un site qui 'n'a rien changé'. Pense que les clients viennent par le bouche-à-oreille.",
    pain_principal: "Ses tables sont à moitié vides en semaine alors que le resto d'en face affiche complet. Il ne comprend pas pourquoi.",
    gain_desire: "Remplir ses tables 5 soirs/semaine sans baisser ses prix ni dépendre d'un apporteur d'affaires.",
    objection_numero_1: "Mon site fonctionne depuis 10 ans, pourquoi changer maintenant ?",
    reponse_objection: "Votre site 'fonctionne' au sens technique — il existe. Mais 60% de vos visiteurs arrivent sur mobile et repartent en moins de 8 secondes parce que le site met 9s à charger. Ce n'est pas un site qui travaille pour vous, c'est un site qui vous coûte des réservations.",
    trigger_emotionnel: "La fierté de son établissement vs l'humiliation silencieuse d'un site amateur qui trahit la qualité de sa cuisine.",
    angle_gagnant: "Incohérence Premium — votre cuisine vaut 3 étoiles, votre site en vaut zéro."
  },
  avocat: {
    profil: "Avocat associé ou fondateur de cabinet",
    age_typique: "38–55 ans",
    rapport_au_digital: "Rationnel et méfiant. Veut des preuves, pas des promesses. A peur de paraître 'racoleur'.",
    pain_principal: "Ses dossiers viennent uniquement du réseau. Il dépend de recommandations et ne maîtrise pas son flux de clients.",
    gain_desire: "Générer 3–5 nouveaux dossiers qualifiés par mois sans prospecter activement.",
    objection_numero_1: "La réputation d'un avocat se construit sur le sérieux, pas sur un beau site.",
    reponse_objection: "Exactement — et c'est pour ça qu'un site qui ressemble à 2009 détruit votre crédibilité avant même que le prospect ait lu votre nom. 67% des clients cherchent leur avocat sur Google. Le premier site qu'ils visitent gagne la confiance par défaut.",
    trigger_emotionnel: "La peur de paraître moins sérieux que des concurrents plus jeunes et plus visibles en ligne.",
    angle_gagnant: "Crédibilité Numérique — vos concurrents LegalTech captent vos clients pendant que vous dormez."
  },
  coiffeur: {
    profil: "Propriétaire de salon indépendant",
    age_typique: "32–50 ans",
    rapport_au_digital: "Actif sur Instagram mais pense que son site est secondaire. Sous-estime l'impact de la prise de RDV en ligne.",
    pain_principal: "Gère les RDV par téléphone et WhatsApp — perd 30% de ses créneaux à cause de no-shows et de la friction de la prise de RDV.",
    gain_desire: "Remplir son agenda automatiquement, sans décrocher le téléphone entre deux clients.",
    objection_numero_1: "Mes clientes me trouvent sur Instagram, pas sur Google.",
    reponse_objection: "Instagram attire l'œil, mais c'est votre site qui convertit. Quand une nouvelle cliente vous découvre, elle cherche vos tarifs et tente de réserver en ligne. Si elle ne peut pas faire ça en 2 clics, elle appelle le salon d'à côté qui a Planity.",
    trigger_emotionnel: "L'agenda vide du lundi matin et les créneaux perdus à cause d'une prise de RDV trop compliquée.",
    angle_gagnant: "Agenda Plein — chaque créneau non réservé en ligne est de l'argent laissé sur la table."
  },
  artisan: {
    profil: "Artisan indépendant ou patron de petite entreprise (plombier, électricien, menuisier, peintre...)",
    age_typique: "38–55 ans",
    rapport_au_digital: "Très sceptique. 'J'ai toujours eu du travail par le bouche-à-oreille.' Sensible uniquement au ROI concret.",
    pain_principal: "Dépend du bouche-à-oreille et craint les périodes creuses. Ne sait pas d'où viendront ses prochains chantiers.",
    gain_desire: "Avoir un flux régulier de devis qualifiés sans dépendre de la saison ou des recommandations.",
    objection_numero_1: "J'ai pas le temps de m'occuper d'un site, j'ai des chantiers.",
    reponse_objection: "C'est précisément pour ça qu'on le fait pour vous. Vous ne touchez à rien — le site travaille pendant que vous êtes sur le chantier. Vos concurrents qui ont un site optimisé reçoivent des demandes de devis la nuit.",
    trigger_emotionnel: "La peur des mois creux et la frustration de voir un concurrent moins qualifié avoir plus de travail grâce à sa visibilité.",
    angle_gagnant: "Chantiers en Continu — votre expertise mérite une vitrine qui génère des devis 24h/24."
  },
  medecin: {
    profil: "Médecin ou praticien libéral",
    age_typique: "40–60 ans",
    rapport_au_digital: "Passif — a un site 'par obligation'. Ne mesure jamais ses résultats en ligne.",
    pain_principal: "Agenda surchargé de rendez-vous non pertinents, patients qui arrivent sans informations claires sur les spécialités.",
    gain_desire: "Des patients mieux informés, moins d'appels répétitifs pour des questions basiques, agenda optimisé.",
    objection_numero_1: "Mes patients me connaissent déjà, je n'ai pas besoin de me vendre.",
    reponse_objection: "Vos patients actuels vous connaissent. Mais les nouveaux patients cherchent un spécialiste sur Google, voient votre site, ne comprennent pas votre spécialité clairement et appellent le praticien suivant dont le site est plus clair.",
    trigger_emotionnel: "Le temps perdu à répondre aux mêmes questions par téléphone, et les nouveaux patients perdus au profit de confrères mieux référencés.",
    angle_gagnant: "Filtrage Intelligent — un site clair attire les bons patients et filtre les mauvais appels."
  },
  immobilier: {
    profil: "Directeur d'agence ou agent indépendant",
    age_typique: "35–55 ans",
    rapport_au_digital: "Conscient de l'importance du digital mais pense que SeLoger fait le travail. Sous-estime son propre site.",
    pain_principal: "Dépend entièrement des portails (SeLoger, LeBonCoin) et paie des abonnements élevés pour des leads froids.",
    gain_desire: "Générer ses propres leads vendeurs et acheteurs qualifiés directement, sans commission de portail.",
    objection_numero_1: "Tout le monde cherche sur SeLoger, mon site ne servira à rien.",
    reponse_objection: "SeLoger vous donne des leads froids que vous partagez avec 15 concurrents. Votre propre site vous donne des leads chauds — des gens qui ont cherché votre agence spécifiquement, qui connaissent votre secteur et qui font confiance à votre expertise locale.",
    trigger_emotionnel: "La dépendance aux portails et les marges qui s'érodent à chaque commission.",
    angle_gagnant: "Indépendance Digitale — arrêtez de payer SeLoger pour vos propres clients."
  },
  default: {
    profil: "Dirigeant de TPE/PME",
    age_typique: "38–55 ans",
    rapport_au_digital: "Conscient que le digital est important mais ne sait pas par où commencer. A souvent été déçu par le passé.",
    pain_principal: "Son site existe mais ne génère rien. Il ne sait pas si c'est normal.",
    gain_desire: "Un site qui travaille pour lui — qui génère des contacts qualifiés sans effort quotidien.",
    objection_numero_1: "J'ai déjà un site, ça marche bien.",
    reponse_objection: "Votre site existe — mais 'marcher bien' signifie générer des contacts réguliers. Si vous ne pouvez pas dire combien de leads viennent de votre site ce mois-ci, il ne travaille pas pour vous.",
    trigger_emotionnel: "La frustration de payer un site qui ne rapporte rien de mesurable.",
    angle_gagnant: "ROI Mesurable — transformez votre site de coût fixe en machine à leads."
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ANGLES D'APPROCHE — Bibliothèque des angles qui convertissent
// ─────────────────────────────────────────────────────────────────────────────
const ANGLES_LIBRARY = `
BIBLIOTHÈQUE DES ANGLES QUI CONVERTISSENT (par ordre d'efficacité) :

1. "INCOHÉRENCE PREMIUM" → Pour les business haut de gamme avec site amateur
   Exemple : "Vous facturez 150€/heure mais votre site ressemble à un devis Word 2010."
   Déclencheur : Score esthétique < 4 + secteur premium (resto gastro, avocat, coach haut de gamme)

2. "LE CONCURRENT QUI VOUS DOUBLE" → Pour les marchés locaux compétitifs
   Exemple : "Le Gourmet Moderne à 300m de chez vous a multiplié ses réservations par 2 après refonte."
   Déclencheur : Secteur compétitif local (restaurant, coiffeur, immobilier)

3. "L'ARGENT QUI S'ÉVAPORE" → Pour les profils ROI-driven
   Exemple : "Votre site reçoit ~300 visites/mois. À 1% de conversion, c'est 3 clients. À 4%, c'est 12. La différence ? 2 000€/mois."
   Déclencheur : Artisan, commerçant, prestataire B2B avec chiffrable

4. "MOBILE MORT" → Pour les sites non responsive
   Exemple : "67% de vos visiteurs arrivent sur mobile. Ils repartent en 8 secondes. Vous perdez 2 personnes sur 3 avant qu'elles aient lu votre nom."
   Déclencheur : LCP > 4s + pas de responsive détecté

5. "L'INVISIBLE GOOGLE" → Pour les sites sans SEO
   Exemple : "Tapez 'restaurant italien Lyon 6e' sur Google. Vous n'êtes pas dans les 10 premiers résultats. Vos concurrents si."
   Déclencheur : Pas de sitemap + meta absentes + score SEO < 30

6. "CRÉDIBILITÉ ZÉRO" → Pour les sites sans preuve sociale
   Exemple : "Votre site n'affiche aucun avis, aucune photo réelle, aucun chiffre. Un nouveau client qui vous découvre n'a aucune raison de vous faire confiance."
   Déclencheur : Pas d'avis Google visible + pas de témoignages + images génériques
`;

// ─────────────────────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES — 3 outputs de qualité que l'agent doit reproduire
// ─────────────────────────────────────────────────────────────────────────────
const FEW_SHOT_STRATEGE = `
=== EXEMPLE 1 — Restaurant gastronomique, score audit 28/100 ===
{
  "angle_approche": "Incohérence Premium — cuisine Michelin, site Wix 2014",
  "point_friction_majeur": "LCP de 8.2s sur mobile : 53% des visiteurs quittent la page avant de voir une seule photo du menu. Le site charge plus lentement que la patience d'un client affamé.",
  "solution_strategique": "Refonte mobile-first avec réservation en 1 clic, galerie plats HD et intégration Google Avis en temps réel — potentiel de +40% de réservations directes en 90 jours.",
  "ton_recommande": "direct",
  "buyer_persona": {
    "profil": "Chef propriétaire, 52 ans, fier de sa cuisine, peu tech-savvy",
    "pain_secret": "Ses tables sont vides le lundi et mardi alors que le restaurant d'en face affiche complet",
    "objection_probable": "Mon site fonctionne depuis 10 ans",
    "reponse_cle": "Il existe depuis 10 ans — mais 60% de vos visiteurs arrivent sur mobile et repartent en 8 secondes. Ce n'est pas un site qui travaille pour vous."
  },
  "timing_ideal": "Septembre — avant la saison haute",
  "preuve_sociale": "Le Comptoir Moderne (concurrent direct, 300m) a doublé ses réservations après une refonte similaire il y a 6 mois.",
  "budget_roi": "Investissement 2 500€ — ROI estimé : +8 000€/mois en réservations captées"
}

=== EXEMPLE 2 — Plombier chauffagiste, score audit 35/100 ===
{
  "angle_approche": "L'Argent qui s'Évapore — 300 visites/mois, zéro formulaire de devis",
  "point_friction_majeur": "Aucun formulaire de contact détecté. Un visiteur intéressé par vos services doit chercher un numéro de téléphone, appeler pendant vos heures de travail, espérer que vous décrochez entre deux chantiers. 80% abandonnent et appellent le plombier suivant.",
  "solution_strategique": "Site avec formulaire devis en 3 champs (nom, type de panne, code postal), disponible 24h/24 — chaque nuit génère des devis pendant que vous dormez.",
  "ton_recommande": "froid",
  "buyer_persona": {
    "profil": "Artisan indépendant, 44 ans, sceptique sur le digital",
    "pain_secret": "Dépend uniquement du bouche-à-oreille, craint les mois de janvier/février",
    "objection_probable": "J'ai toujours eu du travail sans site, ça va aller",
    "reponse_cle": "Vos concurrents qui ont un formulaire en ligne reçoivent des demandes de devis la nuit. Vous, vous les recevez si le client a votre numéro et du courage pour appeler."
  },
  "timing_ideal": "Octobre — avant les pannes de chaudière de l'hiver",
  "preuve_sociale": "Un plombier à Bordeaux génère 12 devis/mois via son formulaire, dont 8 signés. Son site coûte 1 800€ — il est rentabilisé chaque mois.",
  "budget_roi": "Investissement 1 800€ — ROI estimé dès le 2e mois"
}

=== EXEMPLE 3 — Cabinet d'avocats, score audit 45/100 ===
{
  "angle_approche": "Crédibilité Numérique — vos concurrents LegalTech captent vos clients",
  "point_friction_majeur": "Georgia + Verdana, polices web 2002, aucun témoignage client, aucune spécialisation lisible en 5 secondes. Un client en urgence juridique qui atterrit sur votre site et celui de votre concurrent prendra en 30 secondes une décision basée sur la confiance visuelle — et votre site perd ce match.",
  "solution_strategique": "Refonte avec landing pages par domaine (divorce, droit des affaires, pénal), formulaire de qualification en 3 questions et section 'Nos résultats' avec cas anonymisés.",
  "ton_recommande": "premium",
  "buyer_persona": {
    "profil": "Avocat associé, 47 ans, rationnel, méfiant des promesses marketing",
    "pain_secret": "100% de ses dossiers viennent du réseau — aucune maîtrise de son flux clients",
    "objection_probable": "La réputation d'un avocat se construit sur le sérieux, pas sur un beau site",
    "reponse_cle": "Exactement — et c'est pour ça qu'un site qui date de 2009 détruit votre crédibilité avant même que le prospect ait lu votre nom."
  },
  "timing_ideal": "Janvier — rentrée judiciaire, flux de dossiers élevé",
  "preuve_sociale": "Les cabinets qui ont investi en refonte génèrent 3 à 5 nouveaux dossiers/mois en organique — sans réseau.",
  "budget_roi": "Investissement 3 000€ — ROI : 1 dossier supplémentaire par mois suffit à rentabiliser"
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTEUR DU PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function buildStrategePrompt(auditData: any, secteur: string, brainContext?: any, previousIssues?: string[]): string {
  const personaKey = Object.keys(BUYER_PERSONAS).find(k =>
    secteur.toLowerCase().includes(k)
  ) || 'default';
  const persona = BUYER_PERSONAS[personaKey];

  // Extraire les signaux forts de l'audit pour les injecter
  const piliers = auditData.analyse_piliers || {};
  const scoreGlobal = auditData.score_global || 0;
  const lcp = auditData.core_web_vitals?.lcp || 'inconnu';
  const perfScore = auditData.core_web_vitals?.performance_score || 0;
  const impactData = auditData.estimation_impact || null;

  // Identifier le signal le plus fort (pire pilier)
  const scores = {
    presence: piliers.presence?.score || 5,
    esthetique: piliers.esthetique?.score || 5,
    parcours_ux: piliers.parcours_ux?.score || 5,
    visibilite: piliers.visibilite_performance?.score || 5,
  };
  const worstPilier = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
  const worstPilierName = worstPilier[0];
  const worstPilierScore = worstPilier[1];
  const worstObservation = piliers[worstPilierName === 'visibilite' ? 'visibilite_performance' : worstPilierName]?.observation || '';

  return `Tu es le Stratège de GhostNeural — expert en psychologie de vente et conversion B2B.
Tu dois transformer un audit technique en angle d'attaque émotionnellement percutant.
Ton job : identifier LA douleur qui va faire agir ce prospect. Pas un audit. Une urgence.

=== PROFIL DU PROSPECT ===
Secteur : ${secteur}
Score audit global : ${scoreGlobal}/100
LCP : ${lcp}
Performance Lighthouse : ${perfScore}/100
${impactData ? `Visiteurs perdus/mois estimés : ${impactData.visiteurs_perdus_par_mois || 'non calculé'}
CA non capté estimé : ${impactData.ca_non_capte_estime || 'non calculé'}` : ''}

=== DIAGNOSTIC PILIERS ===
- Présence/Crédibilité : ${scores.presence}/10 — ${piliers.presence?.observation?.slice(0, 200) || 'non analysé'}
- Esthétique/Design : ${scores.esthetique}/10 — ${piliers.esthetique?.observation?.slice(0, 200) || 'non analysé'}
- Parcours UX : ${scores.parcours_ux}/10 — ${piliers.parcours_ux?.observation?.slice(0, 200) || 'non analysé'}
- Visibilité/Performance : ${scores.visibilite}/10 — ${piliers.visibilite_performance?.observation?.slice(0, 200) || 'non analysé'}

POINT DE DOULEUR MAXIMAL DÉTECTÉ : Pilier "${worstPilierName}" à ${worstPilierScore}/10
Observation exacte : "${worstObservation.slice(0, 300)}"

=== PROFIL PSYCHOLOGIQUE DU DÉCIDEUR (${secteur.toUpperCase()}) ===
Profil type : ${persona.profil} (${persona.age_typique})
Rapport au digital : ${persona.rapport_au_digital}
Douleur principale : ${persona.pain_principal}
Ce qu'il veut vraiment : ${persona.gain_desire}
Objection n°1 qu'il va sortir : "${persona.objection_numero_1}"
Comment y répondre : "${persona.reponse_objection}"
Trigger émotionnel : ${persona.trigger_emotionnel}
Angle gagnant par défaut pour ce secteur : ${persona.angle_gagnant}

=== INSTRUCTIONS DU BRAIN (ORCHESTRATEUR) ===
${brainContext?.brain_instructions ? `DIRECTIVES : ${brainContext.brain_instructions}` : 'Pas de directives spécifiques.'}
${brainContext?.brain_top_angles ? `ANGLES PRIORITAIRES IDENTIFIÉS : ${JSON.stringify(brainContext.brain_top_angles)}` : ''}
${brainContext?.brain_ton ? `TON DÉCIDÉ : ${brainContext.brain_ton}` : ''}
${brainContext?.brain_hook ? `HOOK PRINCIPAL DÉCIDÉ : ${brainContext.brain_hook}` : ''}

${previousIssues && previousIssues.length > 0 ? `=== ALERTES / RETOURS SUR LA VERSION PRÉCÉDENTE (RETRY) ===
Le Brain a rejeté ta version précédente pour les raisons suivantes :
${previousIssues.map(i => `- ${i}`).join('\n')}
Tu DOIS impérativement corriger ces points dans cette nouvelle version.` : ''}

=== BIBLIOTHÈQUE DES ANGLES ===
${ANGLES_LIBRARY}

=== EXEMPLES D'OUTPUTS ATTENDUS ===
${FEW_SHOT_STRATEGE}

=== TA MISSION ===
1. Choisis L'angle le plus percutant parmi la bibliothèque — celui qui correspond exactement aux données de cet audit.
2. Identifie LE point de friction qui fait le plus mal à CE type de décideur (pas à "un prospect générique").
3. Propose une solution stratégique concrète, chiffrée, spécifique au secteur.
4. Rédige la réponse à l'objection principale — elle doit être irréfutable.
5. Fournis un timing optimal basé sur la saisonnalité du secteur.
6. Suis IMPÉRATIVEMENT les directives du Brain si elles sont fournies ci-dessus.

RÈGLES ABSOLUES :
- Zéro générique. "Optimisation de Conversion" ou "Obsolescence digitale" sont INTERDITS — ce sont des sorties de fallback, pas des stratégies.
- Chaque champ doit faire référence aux données réelles de l'audit ci-dessus.
- Le point_friction_majeur doit citer une donnée précise (LCP, score, pilier, observation).
- La solution_strategique doit être chiffrée (%, €, délai).

RÉPONDS UNIQUEMENT EN JSON STRICT :
{
  "angle_approche": "<Titre percutant de l'angle — max 10 mots — ex: 'Incohérence Premium : cuisine 3 étoiles, site 0 étoile'>",
  "point_friction_majeur": "<Le blocage précis avec données chiffrées tirées de l'audit — 2-3 phrases>",
  "solution_strategique": "<La transformation concrète proposée avec résultat estimé chiffré — 2 phrases>",
  "ton_recommande": "<direct | froid | premium | empathique — selon le profil décideur>",
  "buyer_persona": {
    "profil": "<Description précise du décideur pour CE secteur>",
    "pain_secret": "<La douleur qu'il ne dira jamais en premier mais qui le ronge>",
    "objection_probable": "<L'objection exacte qu'il va sortir>",
    "reponse_cle": "<La réponse irréfutable en 1-2 phrases>"
  },
  "timing_ideal": "<Le moment optimal pour contacter — avec justification saisonnière>",
  "preuve_sociale": "<Un cas concret ou une statistique sectorielle crédible>",
  "budget_roi": "<Fourchette investissement estimée + ROI en langage prospect>"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function strategeAgent(auditData: any, secteur: string, brainContext?: any, previousIssues?: string[]) {
  try {
    const prompt = buildStrategePrompt(auditData, secteur, brainContext, previousIssues);

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307", // Haiku — suffisant avec un prompt structuré
        max_tokens: 1200,
        temperature: 0.4, // Un peu de créativité pour les angles — pas trop
        system: `Tu es le Stratège de GhostNeural. Tu transformes des audits techniques en arguments de vente percutants.
Tu réponds UNIQUEMENT en JSON valide. Jamais de texte en dehors du JSON. Jamais de \`\`\`json ou \`\`\`.
Tu ne produis jamais d'output générique — chaque réponse est spécifique aux données reçues.`,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Échec Stratège — réponse vide");

    // Parsing robuste — nettoie les backticks si Haiku les glisse quand même
    const cleaned = typeof result === 'string'
      ? result.replace(/```json|```/g, '').trim()
      : JSON.stringify(result);

    const parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;

    // Validation des champs critiques — si vides ou génériques, on log l'alerte
    const genericValues = ["Optimisation de Conversion", "Obsolescence digitale", "Transformation GhostNeural"];
    if (genericValues.includes(parsed.angle_approche)) {
      console.warn("[Stratège] ⚠️ Output générique détecté — vérifier le prompt ou les données d'audit");
    }

    return {
      // Champs compatibles UI existante — ne pas renommer
      angle_approche:       parsed.angle_approche       || "Rupture de Valeur Digitale",
      point_friction_majeur: parsed.point_friction_majeur || "Décalage critique entre qualité réelle et présence digitale",
      solution_strategique:  parsed.solution_strategique  || "Refonte conversion-first avec résultats mesurables en 90 jours",
      ton_recommande:        parsed.ton_recommande        || "direct",
      // Champs enrichis — disponibles pour le Copywriter et l'Architecte
      buyer_persona:         parsed.buyer_persona         || null,
      timing_ideal:          parsed.timing_ideal          || null,
      preuve_sociale:        parsed.preuve_sociale         || null,
      budget_roi:            parsed.budget_roi             || null,
    };

  } catch (error) {
    console.error("⚠️ Erreur Stratège:", error);
    // Fallback minimal — on évite le générique complet en utilisant les données brutes
    const scoreGlobal = auditData?.score_global || 0;
    const secteurLabel = secteur || "votre secteur";
    return {
      angle_approche:        `Site ${scoreGlobal < 40 ? 'critique' : 'insuffisant'} pour ${secteurLabel}`,
      point_friction_majeur: auditData?.analyse_piliers?.parcours_ux?.observation?.slice(0, 150) || "Parcours utilisateur non optimisé",
      solution_strategique:  "Refonte prioritaire — audit complet disponible sur demande",
      ton_recommande:        "direct",
      buyer_persona:         null,
      timing_ideal:          null,
      preuve_sociale:        null,
      budget_roi:            null,
    };
  }
}
