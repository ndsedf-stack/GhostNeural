import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostic: any = {
    timestamp: new Date().toISOString(),
    env: {
      has_gemini: !!process.env.GEMINI_API_KEY,
      has_openai: !!process.env.OPENAI_API_KEY,
      has_anthropic: !!process.env.ANTHROPIC_API_KEY,
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_supabase_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    tests: {}
  };

  // Test Supabase Connection
  try {
    const start = Date.now();
    // Check count and a small sample
    const { data: countData, error: countError, count } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    const { data: samples, error: sampleError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .limit(3);

    diagnostic.tests.supabase = { 
      status: (countError || sampleError) ? 'error' : 'ok', 
      error: countError || sampleError,
      latency: `${Date.now() - start}ms`, 
      total_count: count,
      samples: samples || []
    };
  } catch (e: any) {
    diagnostic.tests.supabase = { status: 'crash', error: e.message, cause: e.cause };
  }

  // Test Google DNS / Connectivity
  try {
    const start = Date.now();
    const res = await fetch('https://www.google.com', { method: 'HEAD' });
    diagnostic.tests.google_ping = { status: 'ok', code: res.status, latency: `${Date.now() - start}ms` };
  } catch (e: any) {
    diagnostic.tests.google_ping = { status: 'fail', error: e.message, cause: e.cause };
  }

  return NextResponse.json(diagnostic);
}
