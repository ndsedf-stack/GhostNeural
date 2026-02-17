import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-key',
    openai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-key',
    anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-key',
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-project-url',
    resend: !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_123456789',
  };

  return NextResponse.json(config);
}
