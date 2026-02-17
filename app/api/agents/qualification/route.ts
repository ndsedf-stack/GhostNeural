import { NextRequest, NextResponse } from 'next/server';
import { runQualificationAgent } from '@/lib/agents/qualification';

export async function POST(req: NextRequest) {
  try {
    const { url, secteur, ville, nom, quickData, score_eclaireur, red_flags } = await req.json();
    
    const enrichedQuickData = {
      ...quickData,
      score_eclaireur,
      red_flags: typeof red_flags === 'string' ? JSON.parse(red_flags) : (red_flags || [])
    };

    const result = await runQualificationAgent(
      url, 
      secteur || 'default', 
      enrichedQuickData, 
      nom, 
      ville
    );

    return NextResponse.json({ 
      ...result, 
      prospect: { url, secteur, ville, nom } 
    });
  } catch (e: any) {
    console.error("[Qualification API] Error:", e);
    return NextResponse.json({ 
      error: e.message,
      prospect_interessant: false,
      score_global: 0,
      scores: { business: 0, transformation: 0, conversion: 0, rentabilite: 0 },
      priorite: 'basse',
      raison: `Erreur qualification: ${e.message}`
    }, { status: 200 });
  }
}
