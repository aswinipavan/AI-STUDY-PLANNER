/**
 * Test JWT Generator for Playwright E2E Tests
 * 
 * This script generates valid JWT tokens for testing purposes only.
 * It uses the same JWT_SECRET and algorithm as the backend to create
 * cryptographically valid tokens that will pass backend validation.
 * 
 * SECURITY NOTES:
 * - Only for local E2E testing
 * - Uses dev JWT_SECRET (not production secrets)
 * - Does not modify production authentication code
 * - Tokens are deterministic for consistent testing
 */

import * as crypto from 'crypto';

interface JwtPayload {
  sub: string;           // studentId (UUID)
  firebaseUid: string;   // Firebase UID
  role: string;          // ROLE_USER
  iat: number;           // Issued at timestamp
  exp: number;           // Expiration timestamp
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateTestJwt(studentId: string, firebaseUid: string, jwtSecret: string, expirationMs: number = 86400000): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expirationMs / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload: JwtPayload = {
    sub: studentId,
    firebaseUid: firebaseUid,
    role: 'ROLE_USER',
    iat: now,
    exp: exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Export test token generation function
export function createTestJwt(params?: {
  studentId?: string;
  firebaseUid?: string;
  jwtSecret?: string;
  expirationMs?: number;
}): string {
  // Default test values - deterministic for consistent testing
  const studentId = params?.studentId || 'e2e-test-student-id-12345678-1234-1234-1234-123456789012';
  const firebaseUid = params?.firebaseUid || 'e2e-test-firebase-uid-12345';
  
  // SECURITY: Read JWT_SECRET from environment first, with fallback to test key for local/CI test runners.
  const jwtSecret = params?.jwtSecret || process.env.JWT_SECRET || 'vhcDmPCG4eWST4HzoysATzkmLoQNRdumIjeRdODY/w4=';
  
  const expirationMs = params?.expirationMs || 86400000; // 24 hours

  return generateTestJwt(studentId, firebaseUid, jwtSecret, expirationMs);
}

// Generate and log a test token if run directly
if (typeof require !== 'undefined' && require.main === module) {
  const testToken = createTestJwt();
  console.log('Generated Test JWT:');
  console.log(testToken);
  console.log('\nToken Details:');
  const [header, payload] = testToken.split('.');
  console.log('Header:', JSON.parse(Buffer.from(header.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()));
  console.log('Payload:', JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()));
}
