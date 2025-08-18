import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

  // crt.sh grab
  const { data } = await axios.get(`https://crt.sh/?q=%.${domain}&output=json`).catch(() => ({ data: [] }));
  const subs = [...new Set(data.map((d: any) => d.name_value))];
  return NextResponse.json({ domain, subdomains: subs });
}
