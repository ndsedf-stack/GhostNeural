import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/orchestrator-v2';

// ─────────────────────────────────────────────────────────────────────────────
// TEST ROUTE — Test du pipeline V2 avec RDV Gurume
// ─────────────────────────────────────────────────────────────────────────────
// Usage: GET http://localhost:3001/api/test-pipeline-v2
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  console.log('🚀 TEST PIPELINE V2 — RDV Gurume (Restaurant Japonais)\n');

  const testLead = {
    nom: 'RDV Gurume',
    site_web: 'https://www.rdvgurume.com',
    secteur: 'Restaurant',
    ville: 'Paris',
    email: 'contact@rdvgurume.com',
  };

  console.log('Lead testé:', testLead);
  console.log('\n' + '═'.repeat(80) + '\n');

  try {
    const result = await runPipeline(testLead);

    console.log('\n' + '═'.repeat(80));
    console.log('📊 RÉSULTAT FINAL');
    console.log('═'.repeat(80));
    console.log('Status:', result.status);
    console.log('Lead ID:', result.leadId);
    console.log('Score:', result.score);
    console.log('Email ready:', result.email_ready);
    if (result.raison_rejet) {
      console.log('Raison rejet:', result.raison_rejet);
    }
    console.log('═'.repeat(80) + '\n');

    return NextResponse.json({
      success: result.status === 'email_ready',
      result,
      message: result.status === 'email_ready'
        ? '✅ PIPELINE SUCCÈS — Email prêt à envoyer !'
        : `⚠️ PIPELINE ARRÊTÉ — Stage: ${result.status}`
    });

  } catch (error: any) {
    console.error('\n❌ ERREUR PIPELINE:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
