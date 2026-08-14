// Quick test of JWT generation - reads secret from environment
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set.');
  process.exit(1);
}
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateTestJwt(studentId, firebaseUid, jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400; // 24 hours

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
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

const token = generateTestJwt(
  'e2e-test-student-id-12345678-1234-1234-1234-123456789012',
  'e2e-test-firebase-uid-12345',
  'k9vPm2Lx5Yq8Zw4Rt7Nb3Ch6aswinipavan12345'
);

console.log('Generated Test JWT:');
console.log(token);
console.log('\nToken Details:');
const [header, payload] = token.split('.');
console.log('Header:', JSON.parse(Buffer.from(header.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()));
console.log('Payload:', JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()));
