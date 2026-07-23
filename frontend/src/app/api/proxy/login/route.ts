import { NextRequest } from 'next/server';

// DEPRECATED: This route is superseded by /api/auth/login which has
// rate limiting, zod validation, and correct cookie handling.
// This route is kept only as a redirect to prevent 404s from any
// external integration that might still reference it.
// TODO: Remove this file after confirming no external service calls it.

export async function POST(request: NextRequest) {
  // NextResponse.rewrite() is not supported in route handlers (Next.js 16).
  // Forward by calling the canonical endpoint directly via internal fetch.
  const canonicalUrl = new URL('/api/auth/login', request.nextUrl.origin);

  const body = await request.text();
  const response = await fetch(canonicalUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'x-forwarded-for': request.headers.get('x-forwarded-for') || 'anonymous',
    },
    body,
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}
