import { NextRequest, NextResponse } from 'next/server';
import { scanQuick } from '@/lib/tools/pageScanner';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    const data = await scanQuick(url);
    if (!data) {
      return NextResponse.json({ error: 'Scan failed', status: 0, ttfb: 9999 }, { status: 200 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, status: 0, ttfb: 9999 }, { status: 200 });
  }
}
