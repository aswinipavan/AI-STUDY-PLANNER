import React, {useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {COLORS} from '@/constants/colors';
import {RADIUS, SPACING} from '@/constants/theme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  containerStyle?: ViewStyle;
  editable?: boolean;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  containerStyle,
  editable = true,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          !!error && styles.error,
        ]}>
        <TextInput
          style={[styles.input, multiline && {height: numberOfLines * 44}]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.TEXT_MUTED}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            style={styles.eyeButton}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    paddingHorizontal: SPACING.MD,
  },
  focused: {
    borderColor: COLORS.PRIMARY,
  },
  error: {
    borderColor: COLORS.DANGER,
  },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    paddingVertical: SPACING.SM + 4,
    minHeight: 48,
  },
  eyeButton: {
    padding: SPACING.XS,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.DANGER,
    marginTop: SPACING.XS,
  },
});
