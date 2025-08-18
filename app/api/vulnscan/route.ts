// app/api/vulnscan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PAYLOADS = {
  xss: "<script>alert('xss')</script>",
  sqli: "' OR 1=1--",
  orl: "http://evil.com",
};

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const results: any = {};
  for (const [k, p] of Object.entries(PAYLOADS)) {
    try {
      const { data: body } = await axios.get(`${url}?q=${encodeURIComponent(p)}`, { timeout: 5000 });
      results[k] = body.includes(p);
    } catch {
      results[k] = false;
    }
  }
  return NextResponse.json({ url, results });
}
