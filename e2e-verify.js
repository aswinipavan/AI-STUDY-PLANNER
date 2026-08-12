/**
 * Runtime E2E Authentication Verification Script
 * Tests the complete auth flow against the live production backend
 */
const https = require('https');

const BACKEND_URL = 'https://ai-study-planner-hp0e.onrender.com';
const FRONTEND_URL = 'https://ai-study-planner-jhh9.vercel.app';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 35000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('='.repeat(70));
  console.log('E2E AUTHENTICATION VERIFICATION — LIVE PRODUCTION');
  console.log('='.repeat(70));

  // STEP 1: Backend Health Check
  console.log('\n[1/5] Backend Health Check...');
  try {
    const health = await httpsGet(`${BACKEND_URL}/actuator/health`);
    console.log(`  Status: ${health.status}`);
    console.log(`  Response: ${health.body}`);
    if (health.status !== 200) {
      console.log('  ❌ Backend is NOT healthy! Cannot proceed.');
      return;
    }
    console.log('  ✅ Backend is LIVE and healthy');
  } catch (e) {
    console.log(`  ❌ Backend health check FAILED: ${e.message}`);
    return;
  }

  // STEP 2: Firebase API Key Validation
  console.log('\n[2/5] Validating Firebase API Key against Google Identity Toolkit...');
  try {
    const firebaseRes = await httpsPost(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAnt8FIoW8t_gt5ItsioRQhHpUJ2o8a-OY',
      { email: 'nonexistent_check_only@example.com', password: 'wrongpassword', returnSecureToken: true }
    );
    console.log(`  Status: ${firebaseRes.status}`);
    const errCode = firebaseRes.body?.error?.message;
    if (errCode === 'API key not valid. Please pass a valid API key.') {
      console.log('  ❌ API KEY IS INVALID — root cause confirmed');
    } else if (errCode === 'EMAIL_NOT_FOUND' || errCode === 'INVALID_PASSWORD' || errCode === 'INVALID_LOGIN_CREDENTIALS') {
      console.log(`  ✅ API Key is VALID (expected auth error: ${errCode})`);
    } else {
      console.log(`  ℹ️  Firebase response: ${JSON.stringify(firebaseRes.body?.error)}`);
    }
  } catch (e) {
    console.log(`  ❌ Firebase check failed: ${e.message}`);
  }

  // STEP 3: Test backend /api/auth/login with a fake token to see the exact error format
  console.log('\n[3/5] Testing backend /api/auth/login response format...');
  try {
    const loginRes = await httpsPost(`${BACKEND_URL}/api/auth/login`, {
      firebaseToken: 'fake-token-to-check-response-format'
    });
    console.log(`  Status: ${loginRes.status}`);
    console.log(`  Response Body: ${JSON.stringify(loginRes.body, null, 2)}`);
    
    if (loginRes.status === 400 || loginRes.status === 401) {
      console.log('  ✅ Backend login endpoint is REACHABLE and responding correctly');
      // Check response structure
      if (loginRes.body?.data !== undefined) {
        console.log('  ✅ Response wraps data in { data: ... } — ApiResponse format confirmed');
      }
      if (loginRes.body?.error || loginRes.body?.message) {
        console.log(`  ✅ Error field: "${loginRes.body?.error || loginRes.body?.message}"`);
      }
    } else if (loginRes.status === 500) {
      console.log('  ⚠️  Backend returned 500 — check FIREBASE_SERVICE_ACCOUNT_JSON env var on Render');
      console.log(`  Error: ${JSON.stringify(loginRes.body)}`);
    }
  } catch (e) {
    console.log(`  ❌ Backend login endpoint FAILED: ${e.message}`);
  }

  // STEP 4: Test CORS headers
  console.log('\n[4/5] Testing CORS headers from backend...');
  try {
    const corsRes = await new Promise((resolve, reject) => {
      const urlObj = new URL(`${BACKEND_URL}/actuator/health`);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
      });
      req.on('error', reject);
      req.end();
    });
    const allowOrigin = corsRes.headers['access-control-allow-origin'];
    console.log(`  Status: ${corsRes.status}`);
    console.log(`  Access-Control-Allow-Origin: ${allowOrigin}`);
    if (allowOrigin === FRONTEND_URL || allowOrigin === '*') {
      console.log('  ✅ CORS is correctly configured for the Vercel frontend');
    } else {
      console.log('  ⚠️  CORS may not include Vercel URL. Current value: ' + allowOrigin);
    }
  } catch (e) {
    console.log(`  ❌ CORS check failed: ${e.message}`);
  }

  // STEP 5: Verify Vercel frontend is live
  console.log('\n[5/5] Checking Vercel frontend deployment...');
  try {
    const frontendRes = await httpsGet(`${FRONTEND_URL}/api/wake`);
    console.log(`  Status: ${frontendRes.status}`);
    const body = JSON.parse(frontendRes.body || '{}');
    console.log(`  Wake Response: ${JSON.stringify(body)}`);
    if (body.status === 'awake') {
      console.log('  ✅ Frontend is LIVE and backend is WARM');
    } else {
      console.log('  ⚠️  Frontend responded but backend not yet warm: ' + JSON.stringify(body));
    }
  } catch (e) {
    console.log(`  ❌ Frontend check failed: ${e.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(70));
}

run().catch(console.error);
