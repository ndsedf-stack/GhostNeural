import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/orchestrator-v2';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { site_web, nom, secteur, email, ville } = body;
    
    if (!site_web || !nom || !secteur) {
      return NextResponse.json({ 
        error: 'Missing required fields: site_web, nom, secteur' 
      }, { status: 400 });
    }
    
    console.log(`[Orchestrator V2 API] Starting pipeline for ${nom} (${site_web})`);
    
    const result = await runPipeline({
      site_web,
      nom,
      secteur,
      ville: ville || '',
      email,
    });
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[Orchestrator V2 API] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
