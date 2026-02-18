import { NextRequest, NextResponse } from 'next/server';
import { runArchitecteAgent } from '@/lib/agents/architecte';

export async function POST(req: NextRequest) {
  try {
    const { 
      auditData, 
      secteur, 
      ville, 
      brain_instructions, 
      previous_issues, 
      stratege_output 
    } = await req.json();
    
    // Ensure auditData is parsed
    const parsedAuditData = typeof auditData === 'string' ? JSON.parse(auditData) : auditData;
    
    if (!parsedAuditData) {
      return NextResponse.json({ error: 'auditData required' }, { status: 400 });
    }

    const result = await runArchitecteAgent(
      parsedAuditData, 
      secteur || 'default', 
      ville || 'France', 
      brain_instructions,
      previous_issues,
      stratege_output
    );
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[Architecte API] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
