import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'BUILD_TIME_DUMMY') {
      return NextResponse.json({ 
        success: true, 
        message: 'Clé API absente ou en mode building. Test ignoré.' 
      });
    }

    // Build-time guard
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({ success: true, message: 'Build phase: skip model list.' });
    }

    // Tester directement avec l'API REST car listModels() peut varier selon la version du SDK
    console.log('[List Models] Fetching available models via REST...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      apiKeyValid: true,
      source: 'REST API',
      modelsCount: data.models?.length || 0,
      models: data.models?.map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
        supportedGenerationMethods: m.supportedGenerationMethods,
      })) || []
    });
    
  } catch (error: any) {
    console.error('[List Models] Fatal error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
