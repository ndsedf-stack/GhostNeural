import { NextRequest, NextResponse } from 'next/server';
import { gemini } from '@/lib/llm-clients';

// Test route to list available Gemini models
export async function GET(req: NextRequest) {
  try {
    // Try different model names that might work
    const modelsToTest = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro',
      'models/gemini-pro',
      'models/gemini-1.5-pro'
    ];

    const results = [];

    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing model: ${modelName}`);
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "OK" if you can read this.');
        const text = result.response.text();
        results.push({ model: modelName, status: 'SUCCESS', response: text });
        console.log(`✅ ${modelName} works!`);
      } catch (error: any) {
        results.push({ model: modelName, status: 'FAILED', error: error.message });
        console.log(`❌ ${modelName} failed:`, error.message);
      }
    }

    return NextResponse.json({
      message: 'Model compatibility test complete',
      results,
      workingModels: results.filter(r => r.status === 'SUCCESS').map(r => r.model)
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
