import { NextRequest, NextResponse } from 'next/server';
import { runUltraAudit } from '@/lib/agents/audit';
import { dataReducer } from '@/lib/utils/data-reducer';

export async function POST(req: NextRequest) {
  try {
    const { scannedData, lighthouse, secteur } = await req.json();
    
    // Ensure data is parsed if sent as strings (N8N sometimes does this)
    const parsedScannedData = typeof scannedData === 'string' ? JSON.parse(scannedData) : scannedData;
    const parsedLighthouse = typeof lighthouse === 'string' ? JSON.parse(lighthouse) : lighthouse;
    
    if (!parsedScannedData) {
      return NextResponse.json({ error: 'scannedData required' }, { status: 400 });
    }

    // Transform data using DataReducer
    const reducedInput = await dataReducer(parsedScannedData, parsedLighthouse, secteur || 'default', '');
    const result = await runUltraAudit(reducedInput);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[Audit API] Error:", e);
    return NextResponse.json({ error: e.message, score_global: 0 }, { status: 500 });
  }
}
