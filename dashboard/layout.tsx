// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const key = req.cookies.get('bug_key')?.value || '';
  if (key !== 'daf12**') return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.next();
}
export const config = { matcher: '/dashboard/:path*' };
