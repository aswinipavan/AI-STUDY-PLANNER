import EncryptedStorage from 'react-native-encrypted-storage';

/**
 * Secure storage for the backend JWT.
 *
 * Uses react-native-encrypted-storage which is backed by:
 *   Android: EncryptedSharedPreferences → Android Keystore
 *   iOS: Keychain (not relevant for this Android-only app)
 *
 * The backend JWT MUST NEVER be stored in plain AsyncStorage.
 */

const JWT_KEY = 'backend_jwt';

/**
 * Persist the backend JWT securely.
 */
export async function saveJwt(token: string): Promise<void> {
  await EncryptedStorage.setItem(JWT_KEY, token);
}

/**
 * Retrieve the backend JWT.
 * Returns null if not found or storage read fails.
 */
export async function getJwt(): Promise<string | null> {
  try {
    const token = await EncryptedStorage.getItem(JWT_KEY);
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete the stored backend JWT (used on logout).
 */
export async function clearJwt(): Promise<void> {
  try {
    await EncryptedStorage.removeItem(JWT_KEY);
  } catch {
    // Silently ignore — clearing on logout should not throw
  }
}
