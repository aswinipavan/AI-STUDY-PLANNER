import { NextRequest, NextResponse } from 'next/server';
import { ENV } from '@/constants/config';

// Catch-all API proxy: forwards /api/* requests to the Spring Boot backend,
// attaching the httpOnly access_token cookie as an Authorization header.
// Specific routes (/api/auth/*, /api/wake) take precedence over this catch-all.
async function handleProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const apiPath = path.join('/');
  const token = request.cookies.get('access_token')?.value;

  const url = new URL(`${ENV.BACKEND_URL}/api/${apiPath}`);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host'); // prevent host mismatch on backend

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    // Read the body as an ArrayBuffer, not text(). text() decodes bytes as UTF-8, which corrupts
    // binary payloads (PDFs, images) and destroys multipart/form-data boundaries — the root cause of
    // the HTTP 400 upload failures. ArrayBuffer forwards the exact bytes; the original Content-Type
    // header (including the multipart boundary) is preserved via the copied headers above.
    const requestBody =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined;

    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(120000), // 120s — must outlive the longest client timeout (90s for AI chat)
    });

    const responseBody = await response.arrayBuffer();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[API Proxy Error Catch-All]', error);
    return NextResponse.json({ error: 'Gateway Error' }, { status: 502 });
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE, handleProxy as PATCH };
