import { NextRequest, NextResponse } from 'next/server';
import { runUltraAudit } from '@/lib/agents/audit';

export async function POST(req: NextRequest) {
  try {
    const { scannedData, lighthouse, secteur } = await req.json();
    
    // Ensure data is parsed if sent as strings (N8N sometimes does this)
    const parsedScannedData = typeof scannedData === 'string' ? JSON.parse(scannedData) : scannedData;
    const parsedLighthouse = typeof lighthouse === 'string' ? JSON.parse(lighthouse) : lighthouse;
    
    if (!parsedScannedData) {
      return NextResponse.json({ error: 'scannedData required' }, { status: 400 });
    }

    const result = await runUltraAudit(parsedScannedData, parsedLighthouse, secteur || 'default');
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[Audit API] Error:", e);
    return NextResponse.json({ error: e.message, score_global: 0 }, { status: 200 });
  }
}
