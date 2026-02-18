import { gemini, callLLMWithRetry } from '../llm-clients';
import { extractJsonSafe } from '../utils/json';

// ─────────────────────────────────────────────────────────────────────────────
// LE CRITIQUE — Phase 6 (finale) du Pipeline GhostNeural
// ─────────────────────────────────────────────────────────────────────────────
// Rôle : Relecture qualité + humanisation + sélection de la meilleure variante
// Modèle : Gemini 1.5 Flash (remplace GPT-4o-mini — même qualité, stack unifié)
// Input : output complet du Copywriter (3 variantes + recommandation)
// Output : objet_final + corps_final + qualite_score + raisons de rejet si < 60
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST QUALITÉ — Critères déterministes avant même d'appeler Gemini
// Un email qui rate ces tests ne part pas, peu importe le score LLM
// ─────────────────────────────────────────────────────────────────────────────
interface QualityCheck {
  passed: boolean;
  issue?: string;
}

function runDeterministicChecks(objet: string, corps: string): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const corpsLower = corps.toLowerCase();
  const objetLower = objet.toLowerCase();

  // ── Longueur ──
  const wordCount = corps.split(/\s+/).filter(Boolean).length;
  checks.push({
    passed: wordCount >= 40 && wordCount <= 180,
    issue: wordCount < 40
      ? `Email trop court (${wordCount} mots) — pas assez de contexte pour convaincre`
      : wordCount > 180
      ? `Email trop long (${wordCount} mots) — prospect ne lira pas jusqu'au bout`
      : undefined
  });

  // ── Mots spam / blacklistés ──
  const spamWords = [
    'gratuit', 'offre limitée', 'cliquez ici', 'gagner de l\'argent',
    'révolutionnaire', 'incroyable', 'exceptionnel', 'garanti',
    'sans risque', '100%', 'urgent', 'ne manquez pas', 'profitez',
    'transformer votre vie', 'succès garanti', 'résultats prouvés'
  ];
  const spamFound = spamWords.filter(w => corpsLower.includes(w));
  checks.push({
    passed: spamFound.length === 0,
    issue: spamFound.length > 0 ? `Mots spam détectés : ${spamFound.join(', ')}` : undefined
  });

  // ── Objet ──
  checks.push({
    passed: objet.length >= 15 && objet.length <= 80,
    issue: objet.length < 15
      ? `Objet trop court (${objet.length} chars)`
      : objet.length > 80
      ? `Objet trop long (${objet.length} chars) — tronqué dans la boîte mail`
      : undefined
  });

  // ── Mots d'objet génériques blacklistés ──
  const genericObjects = ['urgence digitale', 'transformation radicale', 'votre site web', 'refonte urgente'];
  const genericFound = genericObjects.filter(g => objetLower.includes(g));
  checks.push({
    passed: genericFound.length === 0,
    issue: genericFound.length > 0 ? `Objet générique détecté : "${genericFound[0]}"` : undefined
  });

  // ── Signature présente ──
  checks.push({
    passed: corpsLower.includes('ghostneural') || corpsLower.includes('nicolas'),
    issue: 'Signature manquante (Nicolas — GhostNeural)'
  });

  // ── Pas de formule de politesse robotique ──
  const robotPhrases = ['cordialement', 'bien à vous', 'sincèrement vôtre', 'en espérant'];
  const robotFound = robotPhrases.filter(p => corpsLower.includes(p));
  checks.push({
    passed: robotFound.length === 0,
    issue: robotFound.length > 0 ? `Formule robotique détectée : "${robotFound[0]}"` : undefined
  });

  // ── Au moins un élément de personnalisation (chiffre ou métrique) ──
  const hasNumber = /\d+/.test(corps);
  checks.push({
    passed: hasNumber,
    issue: hasNumber ? undefined : 'Aucun chiffre ou métrique — email trop vague'
  });

  // ── CTA / Question finale présente ──
  const hasCTA = corps.includes('?') || corps.includes('15 min') || corps.includes('10 min') || corps.includes('appel') || corps.includes('disponible');
  checks.push({
    passed: hasCTA,
    issue: hasCTA ? undefined : 'Pas de CTA ou question finale — le prospect ne sait pas quoi faire'
  });

  return checks;
}

// Score déterministe basé sur les checks (avant Gemini)
function computeDeterministicScore(checks: QualityCheck[]): number {
  const passed = checks.filter(c => c.passed).length;
  return Math.round((passed / checks.length) * 60); // Max 60 — Gemini ajoute les 40 restants
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTEUR DU PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function buildCritiquePrompt(emailData: any, deterministicScore: number, failedChecks: string[]): string {
  // Prépare les 3 variantes pour que Gemini puisse choisir la meilleure
  const varianteA = emailData.variante_a;
  const varianteB = emailData.variante_b;
  const varianteC = emailData.variante_c;
  const hasVariants = varianteA || varianteB || varianteC;

  return `Tu es un expert en copywriting B2B et cold email. Tu relis et améliores des emails de prospection pour une agence web française.

=== EMAIL(S) À RELIRE ===
${hasVariants ? `
VARIANTE A (${varianteA?.framework || 'PAS'}) :
Objet : "${varianteA?.objet || ''}"
Corps : "${varianteA?.corps || ''}"

VARIANTE B (${varianteB?.framework || 'AIDA'}) :
Objet : "${varianteB?.objet || ''}"
Corps : "${varianteB?.corps || ''}"

VARIANTE C (${varianteC?.framework || 'Pattern Interrupt'}) :
Objet : "${varianteC?.objet || ''}"
Corps : "${varianteC?.corps || ''}"

Recommandation initiale du Copywriter : ${emailData.recommandation || 'A'}
` : `
Objet : "${emailData.objet || ''}"
Corps : "${emailData.corps || ''}"
`}

=== PRÉ-CONTRÔLE QUALITÉ (déjà effectué) ===
Score déterministe : ${deterministicScore}/60
${failedChecks.length > 0 ? `Problèmes détectés :\n${failedChecks.map(f => `— ${f}`).join('\n')}` : 'Aucun problème technique détecté ✓'}

=== TA MISSION ===

1. CHOISIR la meilleure variante (ou combiner les forces des 3)
2. CORRIGER les problèmes détectés ci-dessus
3. HUMANISER : supprimer tout ce qui sonne "IA" ou "commercial"
4. VÉRIFIER : chaque chiffre cité est-il crédible ? Pas de promesse irréaliste ?
5. SCORER : attribuer un score final /100

RÈGLES DE RELECTURE :
— Un email humain utilise des phrases imparfaites, pas du copywriting parfait
— "Votre site met 8s à charger" est humain. "Votre présence digitale souffre d'une latence critique" est robotique
— L'objet doit donner une raison d'ouvrir — pas une promesse, une curiosité ou un fait dérangeant
— Le corps doit tenir en une lecture de 20 secondes
— La signature est toujours "Nicolas — GhostNeural" — jamais de prénom inventé
— Score < 60 = email non envoyable — indiquer les corrections obligatoires

CRITÈRES DE SCORING (sur 40 points additionnels) :
— Personnalisation réelle (données audit citées) : 0–15 pts
— Fluidité et naturel (pas robotique) : 0–10 pts  
— Objet accrocheur (donne envie d'ouvrir) : 0–10 pts
— CTA clair et micro-engagement : 0–5 pts

Score final = ${deterministicScore} (déterministe) + score Gemini (0–40)

RÉPONDS UNIQUEMENT EN JSON :
{
  "objet_final": "<Objet corrigé et optimisé>",
  "corps_final": "<Corps corrigé — humain, factuel, percutant>",
  "variante_choisie": "<A, B, C ou Combinée>",
  "qualite_score": <score total /100>,
  "corrections_apportees": ["<correction 1>", "<correction 2>"],
  "envoyable": <true si score >= 60, false sinon>,
  "blocages": ["<raison de blocage si envoyable = false>"]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function critiqueAgent(email: any) {
  // ── ÉTAPE 1 : Checks déterministes sur la variante principale ──
  const objetPrincipal = email.objet || email.variante_a?.objet || '';
  const corpsPrincipal = email.corps || email.variante_a?.corps || '';

  const checks = runDeterministicChecks(objetPrincipal, corpsPrincipal);
  const failedChecks = checks.filter(c => !c.passed).map(c => c.issue!);
  const deterministicScore = computeDeterministicScore(checks);

  // Rejet immédiat si trop de problèmes critiques (ex: objet générique + pas de chiffre)
  const criticalFails = failedChecks.filter(f =>
    f.includes('spam') || f.includes('générique') || f.includes('Aucun chiffre')
  );

  if (criticalFails.length >= 2) {
    console.warn(`[Critique] ⚠️ Rejet préventif — ${criticalFails.length} problèmes critiques`);
    return {
      objet_final:         objetPrincipal,
      corps_final:         corpsPrincipal,
      variante_choisie:    'A',
      qualite_score:       deterministicScore,
      corrections_apportees: criticalFails,
      envoyable:           false,
      blocages:            criticalFails
    };
  }

  // ── ÉTAPE 2 : Gemini affine et humanise ──
  try {
    const model = gemini.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3, // Précision — on corrige, on n'invente pas
        maxOutputTokens: 800
      }
    });

    const prompt = buildCritiquePrompt(email, deterministicScore, failedChecks);

    const result = await callLLMWithRetry<any>(async () => {
      const response = await model.generateContent(prompt);
      return response.response.text();
    });

    if (!result) throw new Error("Réponse vide");

    const cleaned = result.replace(/```json|```/g, '').trim();
    const json = extractJsonSafe(cleaned) || JSON.parse(cleaned);

    // Sécurité : le score final ne peut pas dépasser 100 ni être gonflé artificiellement
    const scoreFinal = Math.min(100, Math.max(0, json.qualite_score || deterministicScore));

    // Sécurité : si Gemini dit "envoyable" mais score < 60, on bloque quand même
    const envoyable = scoreFinal >= 60 && (json.envoyable !== false);

    console.log(`[Critique] Score: ${scoreFinal}/100 — Envoyable: ${envoyable} — Variante: ${json.variante_choisie || 'A'}`);

    return {
      objet_final:          json.objet_final          || objetPrincipal,
      corps_final:          json.corps_final          || corpsPrincipal,
      variante_choisie:     json.variante_choisie     || 'A',
      qualite_score:        scoreFinal,
      corrections_apportees: json.corrections_apportees || [],
      envoyable,
      blocages:             envoyable ? [] : (json.blocages || failedChecks),
    };

  } catch (error) {
    console.error("⚠️ Erreur Critique:", error);

    // Fallback honnête — score déterministe réel, pas de 70 inventé
    const scoreFallback = deterministicScore;
    const envoyable = scoreFallback >= 40 && failedChecks.length < 3;

    return {
      objet_final:          objetPrincipal,
      corps_final:          corpsPrincipal,
      variante_choisie:     'A',
      qualite_score:        scoreFallback,
      corrections_apportees: failedChecks,
      envoyable,
      blocages:             envoyable ? [] : failedChecks,
    };
  }
}
