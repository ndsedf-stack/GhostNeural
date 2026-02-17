import { NextRequest, NextResponse } from 'next/server';
import { runUltraAudit } from '@/lib/agents/audit';

// ─────────────────────────────────────────────────────────────────────────────
// TEST ROUTE — Test isolé de l'agent Audit
// ─────────────────────────────────────────────────────────────────────────────
// Usage: GET http://localhost:3001/api/test-audit-isolated
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🧪 TEST AUDIT AGENT — Données minimales\n');

  // Données minimales simulées (ce que scanFullSite devrait retourner)
  const scannedData = {
    url: 'https://www.rdvgurume.com',
    h1: 'RDV Gurume - Restaurant Japonais',
    meta_title: 'RDV Gurume | Restaurant Japonais à Paris',
    meta_description: 'Découvrez notre cuisine japonaise authentique',
    design_tokens: {
      colors: ['#000000', '#FFFFFF'],
      fonts: ['Arial', 'Helvetica']
    },
    inner_links: ['/menu', '/contact', '/reservation'],
    body_text: 'Restaurant japonais traditionnel situé au cœur de Paris. Spécialités: sushi, sashimi, ramen.',
    image_count: 5,
    form_count: 1,
    cta_count: 2,
    screenshot_desktop: null,
    screenshot_mobile: null
  };

  const lighthouseData = {
    performanceScore: 65,
    lcp: '3.2',
    cls: '0.15',
    ttfb: 800,
    total_byte_weight: 1200000
  };

  const secteur = 'Restaurant';

  console.log('Input scannedData:', JSON.stringify(scannedData, null, 2));
  console.log('\nInput lighthouseData:', JSON.stringify(lighthouseData, null, 2));
  console.log('\nSecteur:', secteur);
  console.log('\n' + '═'.repeat(80) + '\n');

  try {
    const result = await runUltraAudit(scannedData, lighthouseData, secteur);

    console.log('\n' + '═'.repeat(80));
    console.log('📊 RÉSULTAT AUDIT');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log('═'.repeat(80) + '\n');

    // Vérifications du guard
    const guardChecks = {
      hasError: !!result?.error,
      hasScoreGlobal: typeof result?.score_global === 'number',
      hasAnalysePiliers: result?.analyse_piliers !== undefined,
      scoreValue: result?.score_global,
      piliersKeys: result?.analyse_piliers ? Object.keys(result.analyse_piliers) : 'undefined'
    };

    console.log('✅ GUARD CHECKS:', guardChecks);

    const guardPass = !result?.error 
      && typeof result?.score_global === 'number' 
      && result?.analyse_piliers !== undefined;

    console.log('\n🎯 GUARD RESULT:', guardPass ? '✅ PASS' : '❌ FAIL');

    return NextResponse.json({
      success: guardPass,
      guardChecks,
      result,
      message: guardPass ? '✅ Audit agent works correctly' : '❌ Audit agent failed guard checks'
    });

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
