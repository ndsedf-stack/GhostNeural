import { NextRequest, NextResponse } from 'next/server';
import { scanFullSite } from '@/lib/tools/pageScanner';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    
    // scanFullSite doesn't strictly need secteur anymore in its signature 
    // but the actual code from pageScanner shows it only takes (url: string).
    // Let me check the code again.
    const data = await scanFullSite(url);
    
    if (!data) {
      return NextResponse.json({ error: 'Full scan failed' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("[Scan Full API] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
