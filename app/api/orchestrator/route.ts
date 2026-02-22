import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import fs from 'fs';
import path from 'path';

function logToFile(msg: string) {
  const logPath = path.join(process.cwd(), 'debug_api.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] [LEGACY API] ${msg}\n`);
}
import { 
  gemini, 
  openai, 
  anthropic, 
  callLLMWithRetry 
} from '@/lib/llm-clients';
import { 
  ENRICH_SYSTEM_PROMPT, 
  ENRICH_USER_PROMPT_TEMPLATE 
} from '@/lib/prompts/enrichissement';
import { 
  AUDIT_SYSTEM_PROMPT
} from '@/lib/prompts/audit';
import { 
  ARCHI_SYSTEM_PROMPT, 
  ARCHI_USER_PROMPT_TEMPLATE 
} from '@/lib/prompts/architecte';
import { 
  COPY_SYSTEM_PROMPT, 
  COPY_USER_PROMPT_TEMPLATE 
} from '@/lib/prompts/copywriter';
import { dataReducer } from '@/lib/utils/data-reducer';

import { supabaseAdmin } from '@/lib/supabase/admin';

const limit = pLimit(5); // Process 5 leads in parallel

import { guards } from '@/lib/guards';
import { monitoring } from '@/lib/monitoring';
import { cache } from '@/lib/monitoring'; 
import { runLighthouse } from '@/lib/tools/lighthouseRunner';
import { scanQuick, scanFullSite } from '@/lib/tools/pageScanner';
import { runUltraAudit } from '@/lib/agents/audit';
import { runQualificationAgent } from '@/lib/agents/qualification';
import { strategeAgent } from '@/lib/agents/stratege';
import { runArchitecteAgent } from '@/lib/agents/architecte';
import { runCopywriterAgent } from '@/lib/agents/copywriter';
import { critiqueAgent } from '@/lib/agents/critique';
import { sourcing } from '@/lib/sourcing';


async function processLead(lead: any, secteur: string, ville: string) {
  let step = "Initialization";
  try {
    console.log(`Processing lead: ${lead.nom} (${lead.site_web})`);

    // 0. Unified Safety Guard
    step = "Safety Guard";
    const safety = await guards.checkSafety(lead.email, supabaseAdmin);
    if (!safety.allowed) {
      monitoring.captureLeadProcessed(lead.id, 'rejected_safety', 0);
      return { status: 'rejected', reason: safety.reason, leadId: lead.id };
    }

    // 1. PHASE 1: L'Éclaireur Express + Qualification ULTIME
    step = "Phase 1: Qualification Agent";
    const quickData = await scanQuick(lead.site_web);
    if (!quickData) {
      return { status: 'skipped', reason: 'quick_scan_failed', leadId: lead.id };
    }

    const qualification = await runQualificationAgent(lead.site_web, secteur, quickData);
    console.log(`[Qualification] Score: ${qualification.score_global} for ${lead.nom}`);

    if (!qualification.prospect_interessant) {
      monitoring.captureLeadProcessed(lead.id, 'rejected_qualification', qualification.score_global);
      
      // OPTIONAL: Store rejected leads for analytics
      await supabaseAdmin.from('leads').insert([{
        nom: lead.nom || 'Direct Lead (Rejected)',
        secteur: secteur || 'Général',
        ville: ville || 'Inconnue',
        site_web: lead.site_web,
        email: lead.email || "rejected@ghostagency.ai",
        score_audit: qualification.score_global,
        audit_data: { qualification },
        status: 'rejected'
      }]);

      return { status: 'rejected', reason: qualification.raison, leadId: lead.id };
    }

    // 2. PHASE 2: L'Autopsie Totale (Deep Audit)
    step = "Phase 2: Full Autopsy";
    const fullScannedData = await scanFullSite(lead.site_web);
    if (!fullScannedData) {
      return { status: 'skipped', reason: 'full_scan_failed', leadId: lead.id };
    }

    console.log("[Orchestrator] Running Ultra Audit...");
    const lighthouse = await runLighthouse(lead.site_web);
    
    // Transform data using DataReducer
    const reducedInput = await dataReducer(fullScannedData, lighthouse, secteur, ville);
    const auditData: any = await runUltraAudit(reducedInput);

    if (!auditData) {
      monitoring.captureLeadProcessed(lead.id, 'skipped_error_audit', 0);
      return { status: 'skipped', reason: 'audit_failed', leadId: lead.id };
    }

    // Update email if extracted
    const targetEmail = lead.email || auditData.email_extrait;
    if (!targetEmail) {
      monitoring.captureLeadProcessed(lead.id, 'rejected_no_email', 0);
      return { status: 'rejected', reason: 'no_email_found', leadId: lead.id };
    }

    // 2. Le Stratège
    step = "Agent: Le Stratège";
    const strategy = await strategeAgent(auditData, secteur);

    // 2.5 L'Architecte
    step = "Agent: L'Architecte";
    const architecture = await runArchitecteAgent(auditData, secteur, ville);

    // 3. Le Copywriter
    step = "Agent: Le Copywriter";
    const rawEmail = await runCopywriterAgent(strategy, { ...lead, audit_data: auditData });

    // 4. Le Critique
    step = "Agent: Le Critique";
    const finalEmail = await critiqueAgent(rawEmail);

    // 5. Quality Guard
    step = "Quality Guard";
    const qualityCheck = guards.quality(auditData.score_technique || 50, finalEmail?.qualite_score || 50);
    if (!qualityCheck.passed) {
      monitoring.captureLeadProcessed(lead.id, 'rejected_quality', auditData.score_technique);
      return { status: 'rejected', reason: qualityCheck.reason, leadId: lead.id };
    }

    // 6. Store in Supabase (UPSERT to allow reprocessing)
    step = "Database: Store Lead";
    
    // Multi-path safe parsing
    const safeGet = (data: any) => {
      if (!data) return {};
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch(e) { return {}; }
      }
      return data.audit || data.strategy || data.architecture || data;
    };

    const cleanAudit = safeGet(auditData);
    const cleanStrategy = safeGet(strategy);
    const cleanArchi = safeGet(architecture);

    const finalAuditData = { 
      ...cleanAudit, 
      analyse_piliers: cleanAudit.analyse_piliers,
      qualification 
    };
    
    const { data: dbData, error } = await supabaseAdmin.from('leads').upsert([{
      nom: lead.nom || 'Direct Lead',
      secteur: secteur || 'Général',
      ville: ville || 'Inconnue',
      site_web: lead.site_web,
      email: targetEmail,
      score_audit: qualification.score_global || cleanAudit.score_global || 50,
      audit_data: finalAuditData,
      proposition_data: {
        strategy: cleanStrategy,
        architecture: cleanArchi
      },
      email_objet: finalEmail.objet_final,
      email_body: finalEmail.corps_final,
      status: 'email_ready',
      updated_at: new Date().toISOString()
    }], { onConflict: 'site_web' }).select();

    if (error) {
       console.error("Supabase Insert Error:", error);
       throw new Error(`DB_INSERT_ERROR: ${error.message || JSON.stringify(error)}`);
    }

    monitoring.captureLeadProcessed(lead.id, 'success', auditData.score_technique);

    return { status: 'success', leadId: lead.id, dbId: dbData[0].id };
  } catch (error: any) {
    console.error(`Error in step [${step}] for lead ${lead.nom}:`, error);
    if (error.stack) console.error(error.stack);
    const errorMessage = `[${step}] Error: ` + (error?.message || String(error));
    return { status: 'error', leadId: lead.id, error: errorMessage, step };
  }
}

export async function POST(req: NextRequest) {
  try {
    logToFile('--- NEW REQUEST RECEIVED ON LEGACY API ---');
    const body = await req.json();
    logToFile(`Body: ${JSON.stringify(body)}`);
    const { ville, secteur, max_results = 5, leads: providedLeads = [] } = body;

    let targetLeads = providedLeads;

    if (body.website_url || body.site_web) {
      let url = String(body.website_url || body.site_web).trim();
      if (!url.startsWith("http")) url = "https://" + url;
      url = url.replace(/\/$/, ""); // Remove trailing slash to match N8N

      targetLeads = [{
        nom: body.company_name || body.nom || 'Direct Lead',
        site_web: url,
        email: body.email || null
      }];
    }

    // Check for N8N trigger flag
    if (body.trigger_n8n) {
      console.log("[Orchestrator] Triggering N8N Flow...");
      
      // Try both production and test webhooks just in case
      const webhookUrls = [
        'http://127.0.0.1:5678/webhook/ghostneural-brain',
        'http://127.0.0.1:5678/webhook-test/ghostneural-brain'
      ];

      console.log(`[Orchestrator] Starting N8N trigger logic. Webhooks to try: ${webhookUrls.length}`);

      let lastError = null;
      for (const url of webhookUrls) {
        try {
          console.log(`[Orchestrator] TRIGGERING URL: ${url}`);
          const n8nResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nom: body.company_name || body.nom || 'Direct Lead',
              site_web: body.website_url || body.site_web,
              secteur: body.secteur || 'autre',
              ville: body.ville || 'France',
              email: body.email || null
            }),
            signal: AbortSignal.timeout(60000) // Increase to 60s for full flow completion
          });

          console.log(`[Orchestrator] Response status from ${url}: ${n8nResp.status}`);

          if (n8nResp.ok) {
            const text = await n8nResp.text();
            let n8nData = {};
            if (text && text.trim()) {
              try {
                n8nData = JSON.parse(text);
              } catch (e) {
                console.warn(`[Orchestrator] Could not parse n8n response as JSON: ${text.substring(0, 100)}`);
                n8nData = { rawResponse: text };
              }
            }
            
            console.log(`[Orchestrator] SUCCESS: N8N Flow completed via ${url}`);
            return NextResponse.json({ 
              message: 'N8N Triggered', 
              webhook: url,
              n8n: n8nData 
            });
          } else {
            const errText = await n8nResp.text();
            console.error(`[Orchestrator] FAILED ${url} - Status ${n8nResp.status}: ${errText}`);
            lastError = `${n8nResp.status} ${errText}`;
          }
        } catch (e: any) {
          console.error(`[Orchestrator] CATCH ERROR for ${url}:`, e.message);
          lastError = e.message;
        }
      }

      console.error("[Orchestrator] ALL WEBHOOKS FAILED. Last error:", lastError);
      return NextResponse.json({ 
        error: 'N8N_TRIGGER_FAILED', 
        details: lastError,
        suggestion: "Vérifiez que n8n est actif et que le Webhook est en mode Production/Activé."
      }, { status: 502 });
    }

    if (targetLeads.length === 0) {
      targetLeads = await sourcing.getLeads(ville, secteur, max_results);
    }

    targetLeads = targetLeads.slice(0, max_results);
    
    if (targetLeads.length === 0) {
      return NextResponse.json({ error: 'No leads found to process' }, { status: 404 });
    }

    // Process leads in parallel with limit
    const tasks = targetLeads.map((lead: any) => 
      limit(() => processLead(lead, secteur, ville))
    );

    const results = await Promise.all(tasks);

    const success = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: 'Processing completed',
      stats: { total: targetLeads.length, success, errors },
      results
    });

  } catch (error) {
    console.error('Orchestrator error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
