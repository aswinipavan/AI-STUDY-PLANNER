import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';
import type {AuthStackParamList} from '@/navigation/AuthStack';

type SplashNav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

/**
 * Splash screen — shown while RootNavigator restores the session.
 * After a short delay it navigates to Login (session restore is handled
 * by RootNavigator independently; this screen just shows branding).
 */
export function SplashScreen() {
  const navigation = useNavigation<SplashNav>();
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse animation on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Navigate to Login after 2.5s
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, pulseAnim, fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, {opacity: fadeAnim, transform: [{scale: pulseAnim}]}]}>
        <Text style={styles.logoEmoji}>🎓</Text>
        <Text style={styles.appName}>AI Study Planner</Text>
        <Text style={styles.tagline}>Study Smarter. Achieve More.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {alignItems: 'center'},
  logoEmoji: {
    fontSize: 72,
    marginBottom: SPACING.MD,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.XXL,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.5,
  },
});
