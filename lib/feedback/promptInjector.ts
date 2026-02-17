// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK INJECTOR — lib/feedback/promptInjector.ts
// ─────────────────────────────────────────────────────────────────────────────
// Récupère les winners de la semaine depuis Supabase
// et les injecte dynamiquement dans les prompts du Copywriter et du Stratège
//
// Usage dans copywriter-agent.ts :
//   const injection = await getWinnerInjection(secteur);
//   // Puis dans le prompt : ${injection}
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Cache mémoire — évite de requêter Supabase à chaque prospect
// Se vide automatiquement après 1 heure
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

async function getWinnerReport(): Promise<any | null> {
  // Retourner le cache si encore valide
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const { data, error } = await supabase
      .from('stats_dashboard')
      .select('value')
      .eq('key', 'winner_report_latest')
      .single();

    if (error || !data) return null;

    cache = { data: data.value, fetchedAt: Date.now() };
    return data.value;

  } catch (e) {
    console.warn('[PromptInjector] Impossible de charger les winners:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION POUR LE COPYWRITER
// Retourne les emails gagnants du même secteur en few-shot examples
// ─────────────────────────────────────────────────────────────────────────────
export async function getWinnerInjectionForCopywriter(secteur: string): Promise<string> {
  const report = await getWinnerReport();
  if (!report?.winners_by_sector) return '';

  // Cherche le winner du même secteur
  const sectorKey = Object.keys(report.winners_by_sector).find(k =>
    secteur.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(secteur.toLowerCase())
  );

  if (!sectorKey) {
    // Fallback : top winner tous secteurs confondus
    const topWinner = report.top_angles?.[0];
    if (!topWinner?.exemples?.length) return '';

    return `
=== DONNÉES RÉELLES — EMAIL QUI A CONVERTI RÉCEMMENT (autre secteur) ===
Angle : ${topWinner.angle}
Framework : ${topWinner.framework}
Taux de réponse observé : ${topWinner.taux_reponse}%
Objet : "${topWinner.exemples[0]?.objet || ''}"
Corps : "${topWinner.exemples[0]?.corps?.slice(0, 300) || ''}..."
→ Inspire-toi de ce qui a fonctionné mais adapte au secteur ${secteur}.
`;
  }

  const winner = report.winners_by_sector[sectorKey];
  if (!winner?.exemples_gagnants?.length) return '';

  const examples = winner.exemples_gagnants
    .slice(0, 2)
    .map((ex: any, i: number) => `
Exemple réel ${i + 1} (a reçu une réponse) :
Objet : "${ex.objet}"
Corps : "${ex.corps?.slice(0, 350)}..."`)
    .join('\n');

  return `
=== DONNÉES RÉELLES — CE QUI A CONVERTI EN ${secteur.toUpperCase()} CES DERNIÈRES SEMAINES ===
Angle gagnant : ${winner.angle}
Framework qui performe : ${winner.framework}
Taux ouverture observé : ${winner.taux_ouverture}% | Taux réponse : ${winner.taux_reponse}%
${examples}
→ Ces emails ont généré de vraies réponses. Inspire-toi de leur structure et ton, adapte au prospect actuel.
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION POUR LE STRATÈGE
// Retourne l'angle qui a le mieux converti pour ce secteur
// ─────────────────────────────────────────────────────────────────────────────
export async function getWinnerInjectionForStratege(secteur: string): Promise<string> {
  const report = await getWinnerReport();
  if (!report?.winners_by_sector) return '';

  const sectorKey = Object.keys(report.winners_by_sector).find(k =>
    secteur.toLowerCase().includes(k.toLowerCase())
  );

  if (!sectorKey) return '';

  const winner = report.winners_by_sector[sectorKey];

  return `
=== DONNÉES TERRAIN — ANGLE QUI CONVERTIT EN ${secteur.toUpperCase()} ===
Angle gagnant observé : "${winner.angle}"
Framework email associé : ${winner.framework}
Ton qui fonctionne : ${winner.ton}
Performance : ${winner.taux_ouverture}% ouverture | ${winner.taux_reponse}% réponse
→ Cet angle a généré des réponses réelles sur ${winner.nb_envoyes} envois. Priorise-le si les données de l'audit le justifient.
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS RAPIDES — Pour le dashboard War Room
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const report = await getWinnerReport();

  // Stats globales depuis Supabase
  const { data: globalStats } = await supabase
    .from('leads')
    .select('status, secteur, email_angle, score_audit, converted')
    .in('status', ['sent', 'opened', 'replied']);

  if (!globalStats) return null;

  const total = globalStats.length;
  const ouverts = globalStats.filter(l => l.status === 'opened' || l.status === 'replied').length;
  const repondus = globalStats.filter(l => l.status === 'replied').length;
  const convertis = globalStats.filter(l => l.converted === true).length;

  return {
    global: {
      total_envoyes: total,
      taux_ouverture: total > 0 ? Math.round(ouverts / total * 100) : 0,
      taux_reponse: total > 0 ? Math.round(repondus / total * 100) : 0,
      taux_conversion: total > 0 ? Math.round(convertis / total * 100) : 0,
    },
    best_angle: report?.top_angles?.[0]?.angle || 'Pas encore de données',
    best_secteur: report?.top_angles?.[0]?.secteur || 'Pas encore de données',
    winners_updated_at: report?.generated_at || null,
  };
}
