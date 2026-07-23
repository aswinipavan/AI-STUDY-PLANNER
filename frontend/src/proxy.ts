import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/subjects',
  '/exams',
  '/timetable',
  '/materials',
  '/chat',
  '/performance',
  '/priority',
  '/settings',
  '/subscription',
  '/onboarding',
];

// Routes only accessible when NOT authenticated
const AUTH_ONLY_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  
  // Basic structural validation for JWT (header.payload.signature)
  const isValidJwtFormat = accessToken && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(accessToken);
  const isAuthenticated = !!accessToken && isValidJwtFormat;

  // Check if path is a protected route
  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if path is auth-only (login page)
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Redirect unauthenticated users to login
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (isAuthOnlyPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     * - API routes (they handle their own auth via the proxy)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
