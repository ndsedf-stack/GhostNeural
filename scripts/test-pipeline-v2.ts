// ─────────────────────────────────────────────────────────────────────────────
// TEST PIPELINE V2 — Validation du pipeline complet avec un lead réel
// ─────────────────────────────────────────────────────────────────────────────
// Usage: npx tsx scripts/test-pipeline-v2.ts
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'; // Load environment variables
import { runPipeline } from '../lib/orchestrator-v2';


async function main() {
  console.log('🚀 TEST PIPELINE V2 — RDV Gurume (Restaurant Japonais)\n');

  const testLead = {
    nom: 'RDV Gurume',
    site_web: 'https://www.rdvgurume.com',
    secteur: 'Restaurant',
    ville: 'Paris',
    email: 'contact@rdvgurume.com', // Email test
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

    // Si succès, afficher les détails de l'email
    if (result.status === 'email_ready' && result.leadId) {
      console.log('✅ PIPELINE SUCCÈS — Email prêt à envoyer !');
      console.log('\nPour voir les détails complets, vérifier la base de données avec le leadId:', result.leadId);
    } else {
      console.log(`⚠️ PIPELINE ARRÊTÉ — Stage: ${result.status}`);
    }

  } catch (error) {
    console.error('\n❌ ERREUR PIPELINE:', error);
    process.exit(1);
  }
}

main();
