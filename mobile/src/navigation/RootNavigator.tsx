import React, {useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {useAuthStore} from '@/stores/authStore';
import {getJwt} from '@/auth/tokenStorage';
import {loginWithFirebaseToken} from '@/api/auth.api';
import {getCurrentFirebaseUser, getCurrentIdToken, onFirebaseAuthStateChanged} from '@/auth/firebaseAuth';
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
    let isMounted = true;

    async function checkInitialAuth() {
      try {
        const currentUser = getCurrentFirebaseUser();
        if (currentUser) {
          const storedJwt = await getJwt();
          if (storedJwt) {
            const freshFirebaseToken = await getCurrentIdToken(false);
            if (freshFirebaseToken && isMounted) {
              const authResponse = await loginWithFirebaseToken(freshFirebaseToken);
              await setSession(authResponse);
              return;
            }
          }
          const firebaseToken = await getCurrentIdToken(true);
          if (firebaseToken && isMounted) {
            const authResponse = await loginWithFirebaseToken(firebaseToken);
            await setSession(authResponse);
            return;
          }
        }
        if (isMounted) {
          await logout();
        }
      } catch {
        if (isMounted) {
          await logout();
        }
      } finally {
        if (isMounted) {
          setHydrating(false);
        }
      }
    }

    checkInitialAuth();

    const unsubscribe = onFirebaseAuthStateChanged(async firebaseUser => {
      if (!isMounted) {
        return;
      }
      try {
        if (firebaseUser) {
          try {
            const storedJwt = await getJwt();
            if (storedJwt) {
              const freshFirebaseToken = await getCurrentIdToken(false);
              if (freshFirebaseToken && isMounted) {
                const authResponse = await loginWithFirebaseToken(freshFirebaseToken);
                await setSession(authResponse);
                return;
              }
            }
            const firebaseToken = await getCurrentIdToken(true);
            if (firebaseToken && isMounted) {
              const authResponse = await loginWithFirebaseToken(firebaseToken);
              await setSession(authResponse);
              return;
            }
          } catch {
            if (isMounted) {
              await logout();
            }
          }
        } else {
          if (isMounted) {
            await logout();
          }
        }
      } finally {
        if (isMounted) {
          setHydrating(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
