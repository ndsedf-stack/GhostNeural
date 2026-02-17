import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK RESEND — Tracking des événements email
// ─────────────────────────────────────────────────────────────────────────────
// Resend envoie des webhooks pour : sent, opened, clicked, bounced, complained
// On met à jour la table leads avec ces événements pour alimenter le feedback loop
// ─────────────────────────────────────────────────────────────────────────────

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier la signature Resend
    const signature = req.headers.get('resend-signature');
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();

    if (signature && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[Resend Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Parser le payload
    const event = JSON.parse(rawBody);
    console.log('[Resend Webhook] Event received:', event.type);

    // 3. Extraire le lead_id depuis les tags
    const leadId = event.data?.tags?.find((t: any) => t.name === 'lead_id')?.value;
    if (!leadId) {
      console.warn('[Resend Webhook] No lead_id tag found in email');
      return NextResponse.json({ received: true, warning: 'No lead_id tag' });
    }

    // 4. Mettre à jour Supabase selon le type d'événement
    const updates: any = {};
    const emailId = event.data?.email_id;

    switch (event.type) {
      case 'email.sent':
        updates.resend_email_id = emailId;
        updates.sent_at = new Date(event.created_at).toISOString();
        break;

      case 'email.opened':
        updates.email_opened_at = new Date(event.created_at).toISOString();
        break;

      case 'email.clicked':
        updates.email_clicked_at = new Date(event.created_at).toISOString();
        break;

      case 'email.bounced':
        updates.email_bounced_at = new Date(event.created_at).toISOString();
        updates.status = 'bounced';
        break;

      case 'email.complained':
        updates.email_complained_at = new Date(event.created_at).toISOString();
        updates.status = 'complained';
        break;

      default:
        console.log('[Resend Webhook] Unhandled event type:', event.type);
        return NextResponse.json({ received: true });
    }

    // 5. Sauvegarder dans Supabase
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) {
        console.error('[Resend Webhook] Supabase update error:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`[Resend Webhook] Lead ${leadId} updated:`, Object.keys(updates).join(', '));
    }

    return NextResponse.json({ received: true, leadId, event: event.type });

  } catch (error: any) {
    console.error('[Resend Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}