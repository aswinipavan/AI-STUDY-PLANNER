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

/**
 * Decode a JWT payload (base64url) without verifying the signature and decide whether the token
 * is still usable as a session credential. Signature verification happens on the backend; here we
 * only need to reject tokens that are structurally invalid or already expired.
 *
 * This runs in the edge runtime, so it uses `atob` (no Node Buffer). A stale but format-valid
 * cookie must NOT count as authenticated — otherwise proxy.ts bounces /login → /dashboard on a
 * dead token, producing the redirect/blink loop.
 */
function isSessionTokenLive(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    // No exp claim → can't prove it's live; treat as not authenticated.
    if (typeof payload.exp !== 'number') return false;
    // exp is in seconds; add a small skew allowance.
    return payload.exp * 1000 > Date.now() - 5000;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // Authenticated only if a non-expired JWT session cookie is present.
  const isAuthenticated = isSessionTokenLive(accessToken);

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
