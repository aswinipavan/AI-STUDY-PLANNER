import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once (Next.js hot-reload guard)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth
const auth = getAuth(app);

// Google provider — always prompt account selection, request email scope
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore
const db = getFirestore(app);

export { app, auth, googleProvider, db };
