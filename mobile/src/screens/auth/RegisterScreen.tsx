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
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {Input} from '@/components/common/Input';
import {Button} from '@/components/common/Button';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';
import {registerWithEmail} from '@/auth/firebaseAuth';
import {loginWithFirebaseToken} from '@/api/auth.api';
import {useAuthStore} from '@/stores/authStore';
import {getErrorMessage} from '@/utils/errorHandler';

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const {setSession} = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleRegister = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const firebaseToken = await registerWithEmail(data.email, data.password);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🎓</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join thousands of students studying smarter with AI
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({field: {onChange, value}}) => (
              <Input
                label="Email"
                placeholder="student@university.edu"
                value={value ?? ''}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({field: {onChange, value}}) => (
              <Input
                label="Password"
                placeholder="Min 6 characters"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({field: {onChange, value}}) => (
              <Input
                label="Confirm Password"
                placeholder="Repeat your password"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            label="Create Account"
            onPress={handleSubmit(handleRegister)}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  form: {marginBottom: SPACING.LG},
  submitBtn: {marginTop: SPACING.SM},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.PRIMARY_LIGHT,
  },
});
