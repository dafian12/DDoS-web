// app/api/bbtools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
export async function GET(req: NextRequest) {
  const host = new URL(req.url).searchParams.get('host');
  if (!host) return NextResponse.json({ error:'host required' },{status:400});

  const [headers, tech] = await Promise.all([
    axios.get(`https://${host}`, { timeout: 5000 }).then(r => r.headers),
    axios.get(`https://api.wappalyzer.com/v2/lookup/?urls=https://${host}`, { headers:{ 'x-api-key': process.env.WAPP_TOKEN! } })
         .then(r => r.data).catch(() => []),
  ]);

  return NextResponse.json({ host, headers, tech });
}
