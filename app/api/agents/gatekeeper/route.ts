import { NextRequest, NextResponse } from 'next/server';
import { scanQuick } from '@/lib/tools/pageScanner';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`[GATEKEEPER] 🛡️ Incoming scan request for: ${url}`);
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    
    const data = await scanQuick(url);
    if (!data) {
      console.error(`[GATEKEEPER] ❌ Scan failed (returned null) for: ${url}`);
      return NextResponse.json({ error: 'Scan failed', status: 0, ttfb: 9999 }, { status: 500 });
    }
    console.log(`[GATEKEEPER] ✅ Scan success for: ${url}`);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error(`[GATEKEEPER] 💥 CRITICAL ERROR for ${req.url}:`, e.message);
    return NextResponse.json({ error: e.message, status: 0, ttfb: 9999 }, { status: 500 });
  }
}
