import { NextRequest, NextResponse } from 'next/server';
import { runLighthouse } from '@/lib/tools/lighthouseRunner';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    
    const data = await runLighthouse(url);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("[Lighthouse API] Error:", e);
    // Return degraded scores instead of failing hard
    return NextResponse.json({
      performanceScore: 0,
      lcp: '9.9s',
      cls: '1.0',
      ttfb: '9999ms',
      error: e.message
    }, { status: 500 });
  }
}
