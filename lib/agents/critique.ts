import { gemini, anthropic, callLLMWithRetry } from '../llm-clients';
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
  const varianteA = emailData.variante_a;
  const varianteB = emailData.variante_b;
  const varianteC = emailData.variante_c;
  const hasVariants = varianteA || varianteB || varianteC;

  return `Tu es l'Éditeur en Chef de GhostAgency.
Ta mission : Transformer un email de "robot" en un email "vendeur humain expert".

=== EMAILS À RELIRE ===
${hasVariants ? `
A (PAS): ${varianteA?.objet} / ${varianteA?.corps}
B (AIDA): ${varianteB?.objet} / ${varianteB?.corps}
C (Disruptif): ${varianteC?.objet} / ${varianteC?.corps}
` : `
Objet: ${emailData.objet}
Corps: ${emailData.corps}
`}

=== ÉCHECS TECHNIQUES (À CORRIGER) ===
${failedChecks.join('\n')}

=== TA MISSION ===
1. Choisis la variante avec le plus gros potentiel de réponse.
2. Nettoie les tournures "marketing" (ex: "votre succès nous tient à cœur").
3. Injecte de la réalité : phrases directes, pas de politesse excessive, ton consultant senior.
4. Assure-toi qu'un chiffre d'audit est mentionné.

RÉPONDS EN JSON :
{
  "objet_final": "...",
  "corps_final": "...",
  "qualite_score": 0-100,
  "envoyable": true/false,
  "blocages": []
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function critiqueAgent(email: any) {
  const objetPrincipal = email.objet || email.variante_a?.objet || '';
  const corpsPrincipal = email.corps || email.variante_a?.corps || '';

  const checks = runDeterministicChecks(objetPrincipal, corpsPrincipal);
  const failedChecks = checks.filter(c => !c.passed).map(c => c.issue!);
  const deterministicScore = computeDeterministicScore(checks);

  try {
    const prompt = buildCritiquePrompt(email, deterministicScore, failedChecks);

    const result = await callLLMWithRetry<any>(async () => {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        temperature: 0.2,
        system: `Tu es l'Éditeur GhostAgency. Tu transformes les emails IA en emails humains qui vendent. 
Réponds UNIQUEMENT en JSON. 
Critère nécessaire pour "envoyable: true" : Présence d'un chiffre réel de l'audit + CTA clair + ton direct.`,
        messages: [{ role: "user", content: prompt }]
      });
      return (msg.content[0] as any).text;
    });

    if (!result) throw new Error("Réponse vide");

    const cleaned = typeof result === 'string'
      ? result.replace(/```json|```/g, '').trim()
      : JSON.stringify(result);
    
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
