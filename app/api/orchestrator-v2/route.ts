import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/orchestrator-v2';
import fs from 'fs';
import path from 'path';

function logToFile(msg: string) {
  const logPath = path.join(process.cwd(), 'debug_api.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
}

export async function POST(req: NextRequest) {
  try {
    logToFile('--- NEW REQUEST RECEIVED ---');
    const body = await req.json();
    logToFile(`Body: ${JSON.stringify(body)}`);
    
    const { site_web, nom, secteur, email, ville, trigger_n8n, leadId } = body;
    
    // ════════════════════════════════════════════════════════════════
    // OPTION : TRIGGER N8N (Orchestration Externe)
    // ════════════════════════════════════════════════════════════════
    if (trigger_n8n) {
      logToFile(`⚡ N8N TRIGGER REQUESTED for ${nom} (leadId: ${leadId})`);
      console.log(`[Orchestrator V2 API] ⚡ N8N TRIGGER REQUESTED`);

      if (!site_web || !nom) {
        return NextResponse.json({ error: 'site_web and nom are required for n8n trigger' }, { status: 400 });
      }
      
      const baseUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
      const webhookUrls = [
        `${baseUrl}/webhook-test/ghostneural-brain`,
        `${baseUrl}/webhook/ghostneural-brain`
      ];

      let lastError = '';
      for (const url of webhookUrls) {
        try {
          console.log(`[Orchestrator V2 API] Calling n8n: ${url}...`);
          const n8nResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site_web, nom, secteur: secteur || 'autre', ville: ville || 'France', email: email || '', leadId }),
            cache: 'no-store'
          });

          if (n8nResp.ok) {
            return NextResponse.json({ status: 'n8n_triggered', message: 'Le flow n8n a été lancé avec succès.' });
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      // Fallback: If n8n fails, run internal pipeline instead of returning error
      console.warn(`[Orchestrator V2 API] N8N failed, falling back to internal pipeline...`);
    }

    // ════════════════════════════════════════════════════════════════
    // ORCHESTRATION INTERNE (GhostNeural Engine)
    // ════════════════════════════════════════════════════════════════
    console.log(`[Orchestrator V2 API] Starting internal pipeline for ${nom} (${site_web}) - ID: ${leadId || 'NEW'}`);
    
    const result = await runPipeline({
      site_web,
      nom,
      secteur: secteur || 'autre',
      ville: ville || '',
      email: email || '',
    }, leadId);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[Orchestrator V2 API] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
