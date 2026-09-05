import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {Input} from '@/components/common/Input';
import {Button} from '@/components/common/Button';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {signInWithEmail, registerWithEmail} from '@/auth/firebaseAuth';
import {loginWithFirebaseToken} from '@/api/auth.api';
import {useAuthStore} from '@/stores/authStore';
import {getErrorMessage} from '@/utils/errorHandler';

// ── Form schemas ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

/**
 * Login / Register screen.
 * Flow:
 *   1. Firebase signIn/createUser → Firebase ID Token
 *   2. POST /api/auth/login { firebaseToken } → backend JWT + student profile
 *   3. setSession(authResponse) → store JWT + navigate to AppTabs
 */
export function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const {setSession} = useAuthStore();

  // ── Login form ──────────────────────────────────────────────────────────────
  const {
    control: loginControl,
    handleSubmit: handleLoginSubmit,
    formState: {errors: loginErrors},
  } = useForm<LoginForm>({resolver: zodResolver(loginSchema)});

  // ── Register form ───────────────────────────────────────────────────────────
  const {
    control: registerControl,
    handleSubmit: handleRegisterSubmit,
    formState: {errors: registerErrors},
  } = useForm<RegisterForm>({resolver: zodResolver(registerSchema)});

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const cleanEmail = data.email.trim();
      const firebaseToken = await signInWithEmail(cleanEmail, data.password);
      const authResponse = await loginWithFirebaseToken(firebaseToken);
      await setSession(authResponse);
      // RootNavigator detects isAuthenticated=true → renders AppTabs
    } catch (err) {
      Alert.alert('Login Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const cleanEmail = data.email.trim();
      const firebaseToken = await registerWithEmail(cleanEmail, data.password);
      const authResponse = await loginWithFirebaseToken(firebaseToken);
      await setSession(authResponse);
    } catch (err) {
      Alert.alert('Registration Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🎓</Text>
          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Sign in to continue your study journey'
              : 'Join thousands of students studying smarter'}
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            onPress={() => setMode('login')}
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('register')}
            style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Form */}
        {mode === 'login' && (
          <View style={styles.form}>
            <Controller
              control={loginControl}
              name="email"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Email"
                  placeholder="student@university.edu"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={loginErrors.email?.message}
                />
              )}
            />
            <Controller
              control={loginControl}
              name="password"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={value ?? ''}
                  onChangeText={onChange}
                  secureTextEntry
                  error={loginErrors.password?.message}
                />
              )}
            />
            <Button
              label="Sign In"
              onPress={handleLoginSubmit(handleLogin)}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <View style={styles.form}>
            <Controller
              control={registerControl}
              name="email"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Email"
                  placeholder="student@university.edu"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={registerErrors.email?.message}
                />
              )}
            />
            <Controller
              control={registerControl}
              name="password"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Password"
                  placeholder="Min 6 characters"
                  value={value ?? ''}
                  onChangeText={onChange}
                  secureTextEntry
                  error={registerErrors.password?.message}
                />
              )}
            />
            <Controller
              control={registerControl}
              name="confirmPassword"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  value={value ?? ''}
                  onChangeText={onChange}
                  secureTextEntry
                  error={registerErrors.confirmPassword?.message}
                />
              )}
            />
            <Button
              label="Create Account"
              onPress={handleRegisterSubmit(handleRegister)}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        )}

        <Text style={styles.disclaimer}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
  },
  content: {
    padding: SPACING.LG,
    paddingBottom: SPACING.XXL,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.XXL,
    marginBottom: SPACING.XL,
  },
  logo: {fontSize: 56, marginBottom: SPACING.MD},
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
    lineHeight: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: RADIUS.MD,
    padding: 4,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    borderRadius: RADIUS.SM,
  },
  modeBtnActive: {backgroundColor: COLORS.PRIMARY},
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  modeBtnTextActive: {color: '#fff'},
  form: {marginBottom: SPACING.LG},
  submitBtn: {marginTop: SPACING.SM},
  disclaimer: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
});
