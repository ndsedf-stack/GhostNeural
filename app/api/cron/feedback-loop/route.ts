// ─────────────────────────────────────────────────────────────────────────────
// CRON ANALYTICS HEBDO — /app/api/cron/feedback-loop/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tourne chaque lundi à 8h via Vercel Cron Jobs
// Calcule les performances par angle/secteur/framework
// Injecte les winners dans les few-shot examples des prompts
//
// Configuration dans vercel.json :
// {
//   "crons": [{ "path": "/api/cron/feedback-loop", "schedule": "0 8 * * 1" }]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────
function getISOWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getPreviousWeekRange(): { start: string; end: string } {
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6); // Lundi de la semaine précédente
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return {
    start: lastMonday.toISOString(),
    end: lastSunday.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — Calculer les performances de la semaine écoulée
// ─────────────────────────────────────────────────────────────────────────────
async function computeWeeklyPerformance() {
  const { start, end } = getPreviousWeekRange();
  const semaine = getISOWeek();

  console.log(`[Feedback Loop] Analyse semaine ${semaine} (${start.slice(0,10)} → ${end.slice(0,10)})`);

  // Récupère tous les leads envoyés la semaine précédente avec leurs métadonnées
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      id, nom, secteur, email_angle, email_framework, email_ton, email_variante,
      email_qualite_score, score_audit, status, open_count, converted, conversion_value,
      email_objet, email_body, replied_at, replied_content,
      sent_at, opened_at
    `)
    .gte('sent_at', start)
    .lte('sent_at', end)
    .in('status', ['sent', 'opened', 'replied']);

  if (error || !leads?.length) {
    console.log('[Feedback Loop] Aucun lead envoyé cette semaine ou erreur:', error?.message);
    return { leads: [], stats: [] };
  }

  console.log(`[Feedback Loop] ${leads.length} leads analysés`);

  // Grouper par angle + framework + secteur
  const groups = new Map<string, {
    secteur: string;
    angle: string;
    framework: string;
    ton: string;
    leads: any[];
  }>();

  for (const lead of leads) {
    const key = `${lead.secteur}__${lead.email_angle}__${lead.email_framework}`;
    if (!groups.has(key)) {
      groups.set(key, {
        secteur: lead.secteur || 'unknown',
        angle: lead.email_angle || 'unknown',
        framework: lead.email_framework || 'unknown',
        ton: lead.email_ton || 'unknown',
        leads: [],
      });
    }
    groups.get(key)!.leads.push(lead);
  }

  const stats = [];
  for (const [key, group] of groups) {
    const total = group.leads.length;
    const ouverts = group.leads.filter(l => l.open_count > 0).length;
    const repondus = group.leads.filter(l => l.replied_at !== null).length;
    const convertis = group.leads.filter(l => l.converted === true).length;
    const scoresMoyen = group.leads.reduce((acc, l) => acc + (l.score_audit || 0), 0) / total;

    // Top 3 emails qui ont eu une réponse — ce sont les few-shot winners
    const emailsGagnants = group.leads
      .filter(l => l.replied_at !== null)
      .sort((a, b) => (b.open_count || 0) - (a.open_count || 0))
      .slice(0, 3)
      .map(l => ({
        objet: l.email_objet,
        corps: l.email_body?.slice(0, 400),
        secteur: l.secteur,
        score_audit: l.score_audit,
        repondu: true,
      }));

    stats.push({
      semaine,
      secteur: group.secteur,
      angle: group.angle,
      framework: group.framework,
      ton: group.ton,
      nb_envoyes: total,
      nb_ouverts: ouverts,
      nb_repondus: repondus,
      nb_convertis: convertis,
      score_moyen_audit: Math.round(scoresMoyen),
      exemples_gagnants: emailsGagnants.length > 0 ? emailsGagnants : null,
    });
  }

  // Upsert dans prompt_performance
  if (stats.length > 0) {
    const { error: upsertError } = await supabase
      .from('prompt_performance')
      .upsert(stats, { onConflict: 'semaine,secteur,angle,framework' });

    if (upsertError) {
      console.error('[Feedback Loop] Erreur upsert stats:', upsertError.message);
    } else {
      console.log(`[Feedback Loop] ${stats.length} entrées de performance sauvegardées`);
    }
  }

  return { leads, stats };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — Identifier les winners et générer les nouveaux few-shot examples
// ─────────────────────────────────────────────────────────────────────────────
async function generateWinnerExamples() {
  // Récupère les top performers sur les 4 dernières semaines
  const { data: topPerformers, error } = await supabase
    .from('prompt_performance')
    .select('*')
    .gte('nb_envoyes', 5) // Minimum 5 envois pour être statistiquement valide
    .gt('nb_repondus', 0)
    .order('taux_reponse', { ascending: false })
    .limit(20);

  if (error || !topPerformers?.length) {
    console.log('[Feedback Loop] Pas assez de données pour générer des winners');
    return null;
  }

  // Grouper par secteur — on veut le meilleur angle par secteur
  const winnersBySector: Record<string, any> = {};

  for (const perf of topPerformers) {
    const secteur = perf.secteur;
    if (!winnersBySector[secteur] || perf.taux_reponse > winnersBySector[secteur].taux_reponse) {
      winnersBySector[secteur] = perf;
    }
  }

  // Générer le rapport des winners
  const winners = Object.values(winnersBySector);
  console.log(`[Feedback Loop] ${winners.length} winners identifiés par secteur`);

  // Sauvegarder le rapport dans Supabase (accessible par les agents)
  const winnerReport = {
    generated_at: new Date().toISOString(),
    semaine: getISOWeek(),
    winners_by_sector: winnersBySector,
    top_angles: winners.map(w => ({
      secteur: w.secteur,
      angle: w.angle,
      framework: w.framework,
      taux_ouverture: w.taux_ouverture,
      taux_reponse: w.taux_reponse,
      exemples: w.exemples_gagnants,
    })),
    // Instructions pour les agents — injectées dans les prompts
    prompt_injection: generatePromptInjection(winners),
  };

  // Stocker dans une table de config accessible par les agents
  await supabase
    .from('stats_dashboard')
    .upsert({
      key: 'winner_report_latest',
      value: winnerReport,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'key' } as any);

  return winnerReport;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — Générer le texte d'injection dans les prompts
// Ce texte est récupéré par le Copywriter et le Stratège au début de chaque run
// ─────────────────────────────────────────────────────────────────────────────
function generatePromptInjection(winners: any[]): string {
  if (!winners.length) return '';

  const lines = winners
    .filter(w => w.exemples_gagnants?.length > 0)
    .map(w => {
      const ex = w.exemples_gagnants[0];
      return `=== WINNER ${w.secteur.toUpperCase()} — ${w.angle} (${w.taux_reponse}% réponse) ===
Framework : ${w.framework} | Ton : ${w.ton}
Objet gagnant : "${ex.objet}"
Corps (extrait) : "${ex.corps?.slice(0, 200)}..."
Score audit du prospect : ${ex.score_audit}/100`;
    });

  return lines.length > 0
    ? `\n=== DONNÉES RÉELLES — CE QUI A CONVERTI CES DERNIÈRES SEMAINES ===\n${lines.join('\n\n')}\n`
    : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 4 — Détecter les réponses "Stop" et mettre à jour opt_outs
// ─────────────────────────────────────────────────────────────────────────────
async function processOptOutReplies() {
  // Récupère les leads qui ont répondu et dont le contenu contient "stop"
  const { data: replies } = await supabase
    .from('leads')
    .select('id, email, replied_content')
    .not('replied_content', 'is', null)
    .eq('status', 'replied');

  if (!replies?.length) return 0;

  let optOutCount = 0;
  for (const lead of replies) {
    const content = (lead.replied_content || '').toLowerCase();
    const isOptOut = ['stop', 'désinscri', 'ne plus recevoir', 'pas intéressé', 'remove', 'unsubscribe']
      .some(keyword => content.includes(keyword));

    if (isOptOut && lead.email) {
      await supabase
        .from('opt_outs')
        .upsert({
          email: lead.email.toLowerCase(),
          reason: `Réponse "Stop" détectée : "${lead.replied_content?.slice(0, 100)}"`,
          source: 'email_reply',
        }, { onConflict: 'email' });

      await supabase
        .from('leads')
        .update({ status: 'rejected', rejection_reason: 'opt_out_reply' })
        .eq('id', lead.id);

      optOutCount++;
    }
  }

  if (optOutCount > 0) {
    console.log(`[Feedback Loop] ${optOutCount} opt-outs traités depuis les réponses`);
  }

  return optOutCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT CONSOLE — Ce qui s'affiche dans les logs Vercel
// ─────────────────────────────────────────────────────────────────────────────
function logReport(stats: any[], winners: any) {
  console.log('\n' + '═'.repeat(50));
  console.log('FEEDBACK LOOP HEBDO — RAPPORT');
  console.log('═'.repeat(50));

  if (stats.length === 0) {
    console.log('Aucune donnée cette semaine.');
    return;
  }

  // Top 3 angles par taux de réponse
  const sorted = [...stats].sort((a, b) => {
    const trA = a.nb_envoyes > 0 ? a.nb_repondus / a.nb_envoyes : 0;
    const trB = b.nb_envoyes > 0 ? b.nb_repondus / b.nb_envoyes : 0;
    return trB - trA;
  });

  console.log('\nTOP ANGLES CETTE SEMAINE :');
  sorted.slice(0, 5).forEach((s, i) => {
    const tr = s.nb_envoyes > 0 ? Math.round(s.nb_repondus / s.nb_envoyes * 100) : 0;
    const to = s.nb_envoyes > 0 ? Math.round(s.nb_ouverts / s.nb_envoyes * 100) : 0;
    console.log(`${i + 1}. [${s.secteur}] ${s.angle} (${s.framework})`);
    console.log(`   Envoyés: ${s.nb_envoyes} | Ouverture: ${to}% | Réponse: ${tr}%`);
  });

  const totalEnvoyes = stats.reduce((acc, s) => acc + s.nb_envoyes, 0);
  const totalOuverts = stats.reduce((acc, s) => acc + s.nb_ouverts, 0);
  const totalRepondus = stats.reduce((acc, s) => acc + s.nb_repondus, 0);

  console.log('\nTOTAUX SEMAINE :');
  console.log(`Envoyés : ${totalEnvoyes}`);
  console.log(`Taux ouverture : ${totalEnvoyes > 0 ? Math.round(totalOuverts / totalEnvoyes * 100) : 0}%`);
  console.log(`Taux réponse : ${totalEnvoyes > 0 ? Math.round(totalRepondus / totalEnvoyes * 100) : 0}%`);
  console.log('═'.repeat(50) + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE PRINCIPALE — Appelée par Vercel Cron ou manuellement
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Sécurité basique — le cron Vercel passe ce header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    console.log('[Feedback Loop] Démarrage analyse hebdomadaire...');
    const startTime = Date.now();

    // Exécution séquentielle des 4 étapes
    const { leads, stats } = await computeWeeklyPerformance();
    const winners          = await generateWinnerExamples();
    const optOutCount      = await processOptOutReplies();

    logReport(stats, winners);

    const duration = Math.round((Date.now() - startTime) / 1000);
    const summary = {
      semaine:        getISOWeek(),
      leads_analyses: leads.length,
      groupes_stats:  stats.length,
      opt_outs:       optOutCount,
      winners_found:  winners?.top_angles?.length || 0,
      duration_s:     duration,
    };

    console.log('[Feedback Loop] Terminé en', duration, 'secondes');
    return NextResponse.json({ success: true, ...summary });

  } catch (error: any) {
    console.error('[Feedback Loop] Erreur critique:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
