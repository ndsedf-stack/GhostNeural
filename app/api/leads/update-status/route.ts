import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { leadId, commercial_status } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID requis" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('leads')
      .update({ commercial_status })
      .eq('id', leadId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Update Status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
