import { NextRequest, NextResponse } from 'next/server';
import { critiqueAgent } from '@/lib/agents/critique';

export async function POST(req: NextRequest) {
  try {
    const { emailData } = await req.json();
    
    // Ensure emailData is parsed
    const parsedEmailData = typeof emailData === 'string' ? JSON.parse(emailData) : emailData;
    
    if (!parsedEmailData) {
      return NextResponse.json({ error: 'emailData required' }, { status: 400 });
    }

    const result = await critiqueAgent(parsedEmailData);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[Critique API] Error:", e);
    return NextResponse.json({ 
      error: e.message,
      envoyable: false,
      qualite_score: 50,
      blocages: [e.message]
    }, { status: 500 });
  }
}
