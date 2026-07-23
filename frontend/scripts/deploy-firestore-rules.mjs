/**
 * Deploys Firestore security rules using the service account.
 * Run with: node scripts/deploy-firestore-rules.mjs
 */

import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SA_PATH = resolve('C:/Users/aswin/Downloads/study-planner-ec1d2-firebase-adminsdk-fbsvc-ddf069b117.json');
const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const PROJECT_ID = sa.project_id;

// ── JWT + Token helpers ───────────────────────────────────────────────────────
function buildJwt(sa, scopes) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: scopes.join(' '),
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
  const jwt = buildJwt(sa, [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/datastore',
  ]);
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

// ── Firestore Rules Source ────────────────────────────────────────────────────
const RULES_SOURCE = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Users ────────────────────────────────────────────────────────────────
    // Each user can read/write only their own profile document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // ── Subjects ─────────────────────────────────────────────────────────────
    match /subjects/{subjectId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Exams ────────────────────────────────────────────────────────────────
    match /exams/{examId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Timetables ───────────────────────────────────────────────────────────
    match /timetables/{timetableId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Timetable Slots ──────────────────────────────────────────────────────
    match /timetableSlots/{slotId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Study Materials ──────────────────────────────────────────────────────
    match /studyMaterials/{materialId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Chat Sessions ────────────────────────────────────────────────────────
    match /chatSessions/{sessionId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;

      // Messages sub-collection
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }

    // ── Marks / Performance ──────────────────────────────────────────────────
    match /marks/{markId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Subscriptions ────────────────────────────────────────────────────────
    match /subscriptions/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only backend (admin SDK) should write subscription status
      allow write: if false;
    }

    // ── Study Plans (legacy) ─────────────────────────────────────────────────
    match /studyPlans/{planId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.studentId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.studentId;
    }

    // ── Deny everything else ─────────────────────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

// ── Deploy via Firestore Rules REST API ──────────────────────────────────────
async function deployRules(token) {
  // Step 1: Create a new ruleset
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: RULES_SOURCE }],
        },
      }),
    }
  );
  const rulesetData = await createRes.json();
  if (!rulesetData.name) {
    throw new Error(`Failed to create ruleset: ${JSON.stringify(rulesetData)}`);
  }
  console.log(`✅ Ruleset created: ${rulesetData.name}`);

  // Step 2: Get the current release for Firestore
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const releaseData = await releaseRes.json();
  console.log(`📋 Current release: ${releaseData.name || 'none'}`);

  // Step 3: Update the release to point to the new ruleset
  const patchRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName: rulesetData.name,
        },
      }),
    }
  );
  const patchData = await patchRes.json();
  if (!patchData.name) {
    throw new Error(`Failed to update release: ${JSON.stringify(patchData)}`);
  }
  console.log(`🚀 Release updated → ${patchData.rulesetName}`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`🔒 Deploying Firestore rules for project: ${PROJECT_ID}\n`);
  const token = await getAccessToken();
  await deployRules(token);
  console.log('\n✨ Firestore security rules deployed successfully!');
  console.log('   Users can now read/write only their own data.');
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
