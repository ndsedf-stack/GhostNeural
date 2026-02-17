import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Tester la méthode listModels() du SDK
    console.log('[List Models] Fetching available models...');
    
    try {
      // @ts-ignore - listModels existe mais pas dans les types
      const models = await genAI.listModels();
      
      return NextResponse.json({
        success: true,
        apiKeyValid: true,
        modelsCount: models?.length || 0,
        models: models?.map((m: any) => ({
          name: m.name,
          displayName: m.displayName,
          supportedGenerationMethods: m.supportedGenerationMethods,
        })) || []
      });
    } catch (listError: any) {
      console.error('[List Models] Error:', listError.message);
      
      // Fallback: tester directement avec l'API REST
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
    }
    
  } catch (error: any) {
    console.error('[List Models] Fatal error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
