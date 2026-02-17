import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend } from '@/lib/resend';

export async function GET(request: Request) {
  // Verify Cron Secret to ensure only Vercel can call this
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch leads ready to be sent (email_ready)
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('status', 'email_ready')
      .limit(5); // Safety limit per cron run

    if (error) throw error;

    const results = [];
    for (const lead of leads || []) {
      // 2. Send via Resend
      const result = await resend.sendEmail({
        to: lead.email,
        subject: lead.email_objet,
        html: lead.email_body.replace(/\n/g, '<br/>'),
      });

      if (result) {
        // 3. Update status in Supabase Admin
        await supabaseAdmin
          .from('leads')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', lead.id);
        
        results.push({ id: lead.id, status: 'sent' });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
