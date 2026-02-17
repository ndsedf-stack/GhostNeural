import 'dotenv/config';
import { runUltraAudit } from '../lib/agents/audit';

// Test minimal pour identifier le problème de l'Audit
async function testAudit() {
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
    console.log('✅ GUARD CHECKS:');
    console.log('  - hasError:', !!result?.error);
    console.log('  - hasScoreGlobal:', typeof result?.score_global === 'number');
    console.log('  - hasAnalysePiliers:', result?.analyse_piliers !== undefined);
    console.log('  - scoreValue:', result?.score_global);
    console.log('  - piliersKeys:', result?.analyse_piliers ? Object.keys(result.analyse_piliers) : 'undefined');

    const guardPass = !result?.error 
      && typeof result?.score_global === 'number' 
      && result?.analyse_piliers !== undefined;

    console.log('\n🎯 GUARD RESULT:', guardPass ? '✅ PASS' : '❌ FAIL');

    if (!guardPass) {
      console.log('\n⚠️ PROBLÈME DÉTECTÉ:');
      if (result?.error) console.log('  - Erreur présente:', result.error);
      if (typeof result?.score_global !== 'number') console.log('  - score_global invalide');
      if (result?.analyse_piliers === undefined) console.log('  - analyse_piliers manquant');
    }

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAudit();
