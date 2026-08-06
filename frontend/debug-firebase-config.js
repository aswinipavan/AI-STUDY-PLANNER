// Debug script to check Firebase configuration loading
// Run with: node frontend/debug-firebase-config.js

const path = require('path');
const fs = require('fs');

console.log('='.repeat(60));
console.log('FIREBASE CONFIGURATION DEBUG');
console.log('='.repeat(60));

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
console.log('\n📁 Loading:', envPath);
console.log('   Exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('\n🔍 Firebase Variables in .env.local:');
  console.log('-'.repeat(60));
  
  const firebaseVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];
  
  firebaseVars.forEach(varName => {
    const line = lines.find(l => l.startsWith(varName + '='));
    if (line) {
      const value = line.split('=')[1];
      if (!value || value.trim() === '') {
        console.log(`❌ ${varName}: EMPTY`);
      } else if (value.includes('placeholder') || value.includes('your-')) {
        console.log(`⚠️  ${varName}: PLACEHOLDER`);
      } else {
        // Show first 10 chars only for security
        const preview = value.length > 10 ? value.substring(0, 10) + '...' : value;
        console.log(`✅ ${varName}: ${preview} (${value.length} chars)`);
      }
    } else {
      console.log(`❌ ${varName}: MISSING`);
    }
  });
}

console.log('\n' + '='.repeat(60));
console.log('Checking project consistency...');
console.log('='.repeat(60));

// Parse actual values
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnvValue = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const apiKey = getEnvValue('NEXT_PUBLIC_FIREBASE_API_KEY');
const authDomain = getEnvValue('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
const projectId = getEnvValue('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
const storageBucket = getEnvValue('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
const messagingSenderId = getEnvValue('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
const appId = getEnvValue('NEXT_PUBLIC_FIREBASE_APP_ID');

console.log('\n📊 Project ID Consistency Check:');
console.log('-'.repeat(60));
console.log('Project ID:', projectId);
console.log('Auth Domain:', authDomain);
console.log('Storage Bucket:', storageBucket);
console.log('App ID:', appId);

// Extract project ID from auth domain
const authDomainProject = authDomain ? authDomain.split('.')[0] : 'N/A';
// Extract project ID from storage bucket
const storageBucketProject = storageBucket ? storageBucket.split('.')[0] : 'N/A';
// Extract project ID from app ID (format: 1:123456:web:xxxxx)
const appIdProject = appId ? `app-${appId.split(':')[0]}` : 'N/A';

console.log('\n🔍 Extracted Project IDs:');
console.log('   From projectId:', projectId);
console.log('   From authDomain:', authDomainProject);
console.log('   From storageBucket:', storageBucketProject);

if (projectId === authDomainProject && projectId === storageBucketProject) {
  console.log('\n✅ All project IDs match! Configuration is consistent.');
} else {
  console.log('\n❌ PROJECT ID MISMATCH DETECTED!');
  console.log('   This will cause authentication failures.');
}

console.log('\n' + '='.repeat(60));
console.log('API Key Validation');
console.log('='.repeat(60));

if (!apiKey) {
  console.log('❌ API Key is missing!');
} else if (apiKey.length < 30) {
  console.log('⚠️  API Key seems too short (expected ~39 chars)');
  console.log('   Length:', apiKey.length);
} else if (!apiKey.startsWith('AIza')) {
  console.log('⚠️  API Key format unexpected (should start with "AIza")');
  console.log('   Starts with:', apiKey.substring(0, 4));
} else {
  console.log('✅ API Key format looks valid');
  console.log('   Length:', apiKey.length, 'chars');
  console.log('   Prefix:', apiKey.substring(0, 4));
}

console.log('\n' + '='.repeat(60));
console.log('DIAGNOSIS COMPLETE');
console.log('='.repeat(60));
console.log('\nIf all checks pass but auth still fails, the issue is likely:');
console.log('1. Firebase console restrictions on the API key');
console.log('2. Browser cache (try incognito mode)');
console.log('3. Firebase project billing/quota limits');
console.log('4. API key needs to be regenerated in Firebase console');
console.log('\n');
