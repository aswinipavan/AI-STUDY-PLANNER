import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Collection refs ──────────────────────────────────────────────────────────
export const usersRef = collection(db, 'users');
export const studyPlansRef = collection(db, 'studyPlans');
export const subjectsRef = collection(db, 'subjects');

// ── User Profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPremium: boolean;
  createdAt: DocumentData;
  updatedAt: DocumentData;
}

/**
 * Fetch a user's Firestore profile by UID.
 * Returns null if the document doesn't exist yet.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/**
 * Create or fully overwrite a user profile document.
 * Safe to call on every login — uses { merge: true } to avoid overwriting fields.
 */
export async function setUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const existing = await getDoc(docRef);

  await setDoc(
    docRef,
    {
      uid,
      isPremium: false,
      ...data,
      updatedAt: serverTimestamp(),
      // Only set createdAt if this is a new document
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

/**
 * Partially update a user profile (e.g. after profile edit).
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
