import { NextRequest, NextResponse } from 'next/server';
import { sourcing } from '@/lib/sourcing';
import { runPipeline } from '@/lib/orchestrator-v2';

export async function POST(req: NextRequest) {
  try {
    const { ville, secteur, count, pipeline = false } = await req.json();

    if (!ville || !secteur) {
      return NextResponse.json({ error: 'ville and secteur are required' }, { status: 400 });
    }

    console.log(`[API Sourcing] 🚀 ${secteur} | ${ville} | pipeline: ${pipeline}`);

    // ÉTAPE 1 — Chasseur
    const leads = await sourcing.getLeads(ville, secteur, count || 10);
    console.log(`[API Sourcing] ✅ ${leads.length} leads trouvés`);

    if (!pipeline) {
      // Mode preview — retourne juste les leads sans lancer le pipeline
      return NextResponse.json({ success: true, count: leads.length, leads });
    }

    // ÉTAPE 2 — Pipeline pour chaque lead (séquentiel pour éviter rate limits)
    const results = [];
    for (const lead of leads) {
      console.log(`[API Sourcing] 🔄 Pipeline → ${lead.nom}`);
      try {
        const result = await runPipeline({
          nom:     lead.nom,
          site_web: lead.site_web,
          secteur:  lead.secteur,
          ville:    lead.ville,
          email:    lead.email || '',
        });
        results.push({ lead: lead.nom, ...result });
        console.log(`[API Sourcing] ${result.status === 'email_ready' ? '✅' : '❌'} ${lead.nom} → ${result.status}`);
      } catch (e: any) {
        console.error(`[API Sourcing] ⚠️ Erreur pipeline ${lead.nom}:`, e.message);
        results.push({ lead: lead.nom, status: 'error', error: e.message });
      }

      // Pause entre leads pour respecter rate limits LLM
      await new Promise(r => setTimeout(r, 1000));
    }

    const stats = {
      total:       results.length,
      email_ready: results.filter(r => r.status === 'email_ready').length,
      rejected:    results.filter(r => r.status?.startsWith('rejected')).length,
      errors:      results.filter(r => r.status === 'error').length,
    };

    console.log(`[API Sourcing] 🎯 DONE →`, stats);
    return NextResponse.json({ success: true, stats, results });

  } catch (error: any) {
    console.error('[API Sourcing] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}