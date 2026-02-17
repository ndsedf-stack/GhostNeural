import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const { leadId, subject, body } = await req.json();

    // 1. Fetch lead to get email
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('email')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead?.email) {
      return NextResponse.json({ error: 'Lead not found or email missing' }, { status: 404 });
    }

    // 2. Send via Resend
    const result = await resend.sendEmail({
      to: lead.email,
      subject: subject,
      html: body.replace(/\n/g, '<br/>'), // Basic text to HTML conversion
    });

    if (result) {
      // 3. Update status in Supabase
      await supabaseAdmin
        .from('leads')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', leadId);
      
      return NextResponse.json({ success: true, resendId: (result as any).id });
    }

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  } catch (error: any) {
    console.error('Resend API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
