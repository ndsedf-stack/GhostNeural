import { NextRequest, NextResponse } from 'next/server';
import { runCopywriterAgent } from '@/lib/agents/copywriter';

export async function POST(req: NextRequest) {
  try {
    const { 
      strategy, 
      archiData, 
      leadInfo, 
      auditData,
      brain_instructions,
      brain_hook,
      brain_ca_perdu,
      brain_ton,
      previous_issues,
      enrichedData
    } = await req.json();
    
    // Ensure data is parsed
    const parsedStrategy = typeof strategy === 'string' ? JSON.parse(strategy) : strategy;
    const parsedArchiData = typeof archiData === 'string' ? JSON.parse(archiData) : archiData;
    const parsedLeadInfo = typeof leadInfo === 'string' ? JSON.parse(leadInfo) : leadInfo;
    const parsedAuditData = typeof auditData === 'string' ? JSON.parse(auditData) : auditData;
    
    if (!parsedStrategy || !parsedLeadInfo) {
      return NextResponse.json({ error: 'strategy and leadInfo required' }, { status: 400 });
    }

    // Combine leadInfo with archi and audit for the agent
    const enrichedLeadInfo = {
      ...parsedLeadInfo,
      archi_data: parsedArchiData,
      audit_data: parsedAuditData,
      enriched_data: enrichedData || parsedLeadInfo?.enriched_data
    };

    const result = await runCopywriterAgent(parsedStrategy, enrichedLeadInfo, {
      brain_instructions,
      brain_hook,
      brain_ca_perdu,
      brain_ton
    }, previous_issues);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[Copywriter API] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
