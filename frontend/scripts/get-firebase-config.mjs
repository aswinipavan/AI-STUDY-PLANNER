/**
 * Fetches the correct Firebase Web App config using the service account.
 * Run with: node scripts/get-firebase-config.mjs
 */

import { createSign } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 1. Load Service Account ──────────────────────────────────────────────────
const SA_PATH = resolve('C:/Users/aswin/Downloads/study-planner-ec1d2-firebase-adminsdk-fbsvc-ddf069b117.json');
const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));

// ── 2. Build a signed JWT for Google OAuth2 ──────────────────────────────────
function buildJwt(sa) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: [
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/cloud-platform',
    ].join(' '),
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const unsigned = `${header}.${claim}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, 'base64url');
  return `${unsigned}.${sig}`;
}

// ── 3. Exchange JWT for an access token ─────────────────────────────────────
async function getAccessToken(sa) {
  const jwt = buildJwt(sa);
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token error: ${JSON.stringify(json)}`);
  return json.access_token;
}

// ── 4. List web apps for the project ────────────────────────────────────────
async function listWebApps(projectId, token) {
  const res = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!json.apps) throw new Error(`listWebApps error: ${JSON.stringify(json)}`);
  return json.apps;
}

// ── 5. Get config for a specific web app ────────────────────────────────────
async function getWebAppConfig(projectId, appId, token) {
  const res = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!json.apiKey) throw new Error(`getConfig error: ${JSON.stringify(json)}`);
  return json;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🔑 Getting access token...');
  const token = await getAccessToken(sa);

  console.log(`📱 Listing web apps for project: ${sa.project_id}`);
  const apps = await listWebApps(sa.project_id, token);
  console.log(`   Found ${apps.length} app(s):`);
  apps.forEach(a => console.log(`   - ${a.displayName || a.appId} (${a.appId})`));

  // Use first web app (or the one matching the appId in env)
  const app = apps[0];
  console.log(`\n📦 Fetching config for: ${app.displayName || app.appId}`);
  const config = await getWebAppConfig(sa.project_id, app.appId, token);

  console.log('\n✅ Firebase Web Config:');
  console.log(JSON.stringify(config, null, 2));

  // ── Write to .env.local ──────────────────────────────────────────────────
  const envPath = resolve(__dirname, '../.env.local');
  let envContent = readFileSync(envPath, 'utf8');

  const replacements = {
    NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
  };

  for (const [key, value] of Object.entries(replacements)) {
    if (!value) continue;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  writeFileSync(envPath, envContent, 'utf8');
  console.log('\n✨ .env.local updated with fresh Firebase config!');
  console.log('   Restart the dev server to apply changes.');
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
