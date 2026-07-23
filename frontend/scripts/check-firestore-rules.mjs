/**
 * Verifies the currently active Firestore security rules.
 * Run with: node scripts/check-firestore-rules.mjs
 */

import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SA_PATH = resolve('C:/Users/aswin/Downloads/study-planner-ec1d2-firebase-adminsdk-fbsvc-ddf069b117.json');
const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const PROJECT_ID = sa.project_id;

function buildJwt(sa) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const unsigned = `${header}.${claim}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  return `${unsigned}.${sign.sign(sa.private_key, 'base64url')}`;
}

async function getAccessToken() {
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
  if (!json.access_token) throw new Error(JSON.stringify(json));
  return json.access_token;
}

(async () => {
  console.log(`🔍 Checking active Firestore rules for: ${PROJECT_ID}\n`);
  const token = await getAccessToken();

  // Get the active release
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const release = await releaseRes.json();
  
  if (release.error) {
    console.log('⚠️  Could not check release:', JSON.stringify(release.error));
    return;
  }

  console.log('📋 Active release:');
  console.log('   Name:', release.name);
  console.log('   Ruleset:', release.rulesetName);
  console.log('   Updated:', release.updateTime);

  // Get the ruleset content
  const rulesetName = release.rulesetName;
  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/${rulesetName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const ruleset = await rulesetRes.json();

  if (ruleset.source?.files?.[0]) {
    console.log('\n✅ Active rules content:');
    console.log('─'.repeat(60));
    console.log(ruleset.source.files[0].content);
    console.log('─'.repeat(60));
  } else {
    console.log('⚠️  Could not retrieve rules content:', JSON.stringify(ruleset));
  }
})().catch(err => {
  console.error('❌', err.message);
});
