import { NextRequest, NextResponse } from 'next/server';
import { strategeAgent } from '@/lib/agents/stratege';

export async function POST(req: NextRequest) {
  try {
    const { 
      auditData, 
      secteur, 
      brain_instructions, 
      brain_top_angles, 
      brain_ton, 
      brain_hook,
      previous_issues,
      enrichedData
    } = await req.json();
    
    // Ensure auditData is parsed
    const parsedAuditData = typeof auditData === 'string' ? JSON.parse(auditData) : auditData;
    
    if (!parsedAuditData) {
      return NextResponse.json({ error: 'auditData required' }, { status: 400 });
    }

    // Inject enrichedData if passed separately
    if (enrichedData) {
      parsedAuditData.enriched_data = enrichedData;
    }

    const result = await strategeAgent(parsedAuditData, secteur || 'default', {
      brain_instructions,
      brain_top_angles,
      brain_ton,
      brain_hook
    }, previous_issues);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[Stratege API] Error:", e);
    return NextResponse.json({ 
      error: e.message,
      angle_approche: 'Optimisation de Conversion',
      point_friction_majeur: 'Site non optimisé',
      solution_strategique: 'Refonte haute conversion',
      ton_recommande: 'direct'
    }, { status: 500 });
  }
}
