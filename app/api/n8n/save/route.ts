import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

function logToFile(msg: string) {
  const logPath = path.join(process.cwd(), 'debug_api.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
}

export async function POST(req: NextRequest) {
  try {
    const lead = await req.json();
    logToFile(`[n8n-Save] 📥 RECEIVING DATA for: ${lead.nom}`);
    logToFile(`[n8n-Save] Payload: ${JSON.stringify(lead)}`);

    const { data, error } = await supabaseAdmin.from('leads').upsert([{
      nom: lead.nom,
      secteur: lead.secteur || 'Général',
      ville: lead.ville || 'France',
      site_web: lead.site_web,
      email: lead.email,
      score_audit: lead.score_opportunite || 50,
      score: lead.score_opportunite || 50, // Added for compliance
      priorite: lead.priorite || 'MOYENNE', // Added for compliance
      score_opportunite: lead.score_opportunite || 50, // Added for compliance
      audit_data: lead.audit_data || {},
      qualification: lead.qualification || {}, // Added for compliance
      proposition_data: lead.proposition_data || {},
      email_objet: lead.email_objet,
      email_body: lead.email_body,
      status: lead.status || 'email_ready',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }], { onConflict: 'site_web' }).select();

    if (error) {
      logToFile(`[n8n-Save] ❌ Supabase Error: ${error.message}`);
      console.error("[n8n-Save] Supabase Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    logToFile(`[n8n-Save] ✅ SUCCESS for: ${lead.nom}`);

    return NextResponse.json({ success: true, leadId: data[0].id });
  } catch (error: any) {
    logToFile(`[n8n-Save] 💥 CRITICAL ERROR: ${error.message}`);
    console.error("[n8n-Save] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
