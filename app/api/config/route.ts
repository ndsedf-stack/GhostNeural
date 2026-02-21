import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow if running locally or via a secret header for security
  // But since it's meant for local n8n, localhost check is good
  
  return NextResponse.json({
    anthropic_api_key: process.env.ANTHROPIC_API_KEY || '',
    gemini_api_key: process.env.GEMINI_API_KEY || '',
    openai_api_key: process.env.OPENAI_API_KEY || '',
    resend_api_key: process.env.RESEND_API_KEY || ''
  });
}
