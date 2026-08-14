import auth from '@react-native-firebase/auth';

/**
 * Firebase Auth helpers for the mobile app.
 * Uses @react-native-firebase/auth (native SDK, not the web Firebase SDK).
 * The Firebase project is: study-planner-ec1d2
 */

/**
 * Sign in with email and password.
 * Returns the Firebase ID token on success.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string> {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  const idToken = await credential.user.getIdToken();
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
  const credential = await auth().createUserWithEmailAndPassword(
    email,
    password,
  );
  const idToken = await credential.user.getIdToken();
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
  const currentUser = auth().currentUser;
  if (!currentUser) {
    return null;
  }
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/**
 * Sign out the current Firebase user.
 */
export async function firebaseSignOut(): Promise<void> {
  await auth().signOut();
}

/**
 * Subscribe to Firebase auth state changes.
 * Returns an unsubscribe function.
 */
export function onFirebaseAuthStateChanged(
  callback: (user: import('@react-native-firebase/auth').FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onAuthStateChanged(callback);
}

/**
 * Get current Firebase user (synchronous).
 */
export function getCurrentFirebaseUser() {
  return auth().currentUser;
}
