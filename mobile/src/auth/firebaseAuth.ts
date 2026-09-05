import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdToken,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';

/**
 * Firebase Auth helpers for the mobile app.
 * Uses @react-native-firebase/auth modular SDK.
 * The Firebase project is: study-planner-ec1d2
 */

const auth = getAuth();

/**
 * Sign in with email and password.
 * Returns the Firebase ID token on success.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string> {
  const cleanEmail = email.trim();
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const idToken = await getIdToken(credential.user);
  return idToken;
}

/**
 * Register a new user with email and password.
 * Returns the Firebase ID token on success.
 */
export async function registerWithEmail(
  email: string,
  password: string,
): Promise<string> {
  const cleanEmail = email.trim();
  const credential = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    password,
  );
  const idToken = await getIdToken(credential.user);
  return idToken;
}

/**
 * Get the current Firebase user's fresh ID token.
 * Pass forceRefresh=true to bypass the 1-hour Firebase cache.
 * Returns null if no user is signed in.
 */
export async function getCurrentIdToken(
  forceRefresh = false,
): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  try {
    return await getIdToken(currentUser, forceRefresh);
  } catch {
    return null;
  }
}

export async function firebaseSignOut(): Promise<void> {
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // Silently ignore if already signed out
  }
}

/**
 * Subscribe to Firebase auth state changes.
 * Returns an unsubscribe function.
 */
export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current Firebase user (synchronous).
 */
export function getCurrentFirebaseUser(): FirebaseAuthTypes.User | null {
  return auth.currentUser;
}
