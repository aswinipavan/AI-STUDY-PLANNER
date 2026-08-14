import React, {useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {useAuthStore} from '@/stores/authStore';
import {getJwt} from '@/auth/tokenStorage';
import {loginWithFirebaseToken} from '@/api/auth.api';
import {getCurrentIdToken, onFirebaseAuthStateChanged} from '@/auth/firebaseAuth';
import {COLORS} from '@/constants/colors';
import {AuthStack} from './AuthStack';
import {AppTabs} from './AppTabs';

/**
 * Root navigator — listens to Firebase auth state changes,
 * restores the backend JWT session on app start, and routes
 * between AuthStack and AppTabs.
 */
export function RootNavigator() {
  const {isAuthenticated, isHydrating, setSession, logout, setHydrating} =
    useAuthStore();

  useEffect(() => {
    /**
     * Session restore flow on app start:
     * 1. Check if there's a stored backend JWT.
     * 2. If yes — try to restore via Firebase auth state.
     * 3. If Firebase has a current user, exchange for a fresh backend JWT.
     * 4. If no stored JWT or Firebase user → go to login.
     */
    const unsubscribe = onFirebaseAuthStateChanged(async firebaseUser => {
      if (firebaseUser) {
        try {
          const storedJwt = await getJwt();
          if (storedJwt) {
            // We have a stored JWT — try to refresh for a fresh one
            const freshFirebaseToken = await getCurrentIdToken(false);
            if (freshFirebaseToken) {
              const authResponse = await loginWithFirebaseToken(freshFirebaseToken);
              await setSession(authResponse);
              return;
            }
          }
          // No stored JWT but Firebase user exists — do a fresh login
          const firebaseToken = await getCurrentIdToken(true);
          if (firebaseToken) {
            const authResponse = await loginWithFirebaseToken(firebaseToken);
            await setSession(authResponse);
            return;
          }
        } catch {
          // Restore failed (backend down?) — stay on login
          await logout();
        }
      } else {
        // No Firebase user
        await logout();
      }
      setHydrating(false);
    });

    return unsubscribe;
  }, [setSession, logout, setHydrating]);

  if (isHydrating) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
