import { NextRequest, NextResponse } from 'next/server';
import { scanFullSite } from '@/lib/tools/pageScanner';

/**
 * Route: scan-full (Alias de deep-scan)
 * Phase 4 du pipeline GhostAgency v2.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    
    console.log(`[API] Scan Full for: ${url}`);
    const data = await scanFullSite(url);
    
    if (!data) {
      return NextResponse.json({ error: 'Full scan failed' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error(`[API] Scan Full Error:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
