import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through API routes, Next.js internals, and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.match(/\.\w+$/)
  ) {
    return NextResponse.next();
  }

  const hasToken = !!request.cookies.get('wbr_token')?.value;

  // Unauthenticated → bounce to login
  if (!hasToken && PROTECTED.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Already authenticated → skip login page
  if (hasToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
