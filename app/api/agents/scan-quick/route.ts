import { NextRequest, NextResponse } from 'next/server';
import { scanQuick } from '@/lib/tools/pageScanner';

/**
 * Route: scan-quick (Alias de gatekeeper)
 * Maintenue pour compatibilité avec les anciens workflows n8n.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    
    console.log(`[API] Scan Quick (Legacy) for: ${url}`);
    const data = await scanQuick(url);
    
    if (!data) {
      return NextResponse.json({ error: 'Scan failed', status: 0, ttfb: 9999 }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error(`[API] Scan Quick Error:`, e.message);
    return NextResponse.json({ error: e.message, status: 0, ttfb: 9999 }, { status: 500 });
  }
}
