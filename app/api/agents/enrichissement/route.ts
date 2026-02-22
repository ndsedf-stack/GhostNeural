import { NextRequest, NextResponse } from 'next/server';
import { runEnrichisseurAgent } from '@/lib/agents/enrichisseur';

/**
 * Route: enrichissement (Phase 3 GhostAgency v2)
 * Transforme un scan technique en Business Intelligence.
 */
export async function POST(req: NextRequest) {
  try {
    const scannedData = await req.json();
    
    // On attend les données du scan + lighthouse
    if (!scannedData || !scannedData.h1) {
      return NextResponse.json({ error: 'Scanned data required (h1, etc)' }, { status: 400 });
    }

    console.log(`[API] Enrichissement agent starting for ${scannedData.url || 'unknown URL'}...`);
    const enrichedData = await runEnrichisseurAgent(scannedData);
    
    return NextResponse.json(enrichedData);
  } catch (e: any) {
    console.error(`[API] Enrichissement Error:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
