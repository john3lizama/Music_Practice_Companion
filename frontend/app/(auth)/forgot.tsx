import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Background } from '../../src/components/Background';
import { BrandMark, Button, GlassCard, H1, Muted } from '../../src/components/ui';
import { colors, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { confirmPasswordReset, requestPasswordReset } from '../../src/api';

export default function Forgot() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const resetMode = !!token;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (resetMode) {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        await confirmPasswordReset(token!, password);
      } else {
        if (!email) throw new Error('Enter your email.');
        await requestPasswordReset(email);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Background testID="forgot-screen">
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable testID="forgot-home" onPress={() => router.replace('/')} style={styles.brand}>
          <BrandMark />
        </Pressable>

        <GlassCard gradient style={styles.card}>
          {done ? (
            <View testID="forgot-done">
              <H1>{resetMode ? 'Password updated' : 'Check your email'}</H1>
              <Muted style={{ marginTop: spacing.sm }}>
                {resetMode
                  ? 'You can sign in with your new password now.'
                  : 'If that account exists, a reset link is on its way. The link expires in 30 minutes.'}
              </Muted>
              <Button
                label="Back to sign in"
                size="lg"
                testID="forgot-to-login"
                onPress={() => router.replace('/(auth)/login')}
                style={{ marginTop: spacing.xl }}
              />
            </View>
          ) : (
            <>
              <H1>{resetMode ? 'Choose a new password' : 'Reset your password'}</H1>
              <Muted style={{ marginTop: spacing.xs }}>
                {resetMode
                  ? 'Enter a new password for your account.'
                  : "Enter your email and we'll send you a reset link."}
              </Muted>

              {resetMode ? (
                <Field
                  label="New password"
                  testID="forgot-password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secure
                />
              ) : (
                <Field
                  label="Email"
                  testID="forgot-email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                />
              )}

              {error ? (
                <Text style={styles.error} testID="forgot-error">
                  {error}
                </Text>
              ) : null}

              <Button
                label={busy ? 'Working…' : resetMode ? 'Update password' : 'Send reset link'}
                size="lg"
                testID="forgot-submit"
                disabled={busy}
                onPress={submit}
                style={{ marginTop: spacing.lg }}
              />

              <Pressable testID="forgot-back" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
                <Text style={styles.link}>Back to sign in</Text>
              </Pressable>
            </>
          )}
        </GlassCard>
      </ScrollView>
    </Background>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  testID?: string;
}) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, maxWidth: 460, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.xl },
  card: { padding: spacing.xl },
  fieldLabel: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: 6, fontWeight: fontWeight.medium },
  input: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 50,
    color: colors.text,
    fontSize: fontSize.md,
    outlineStyle: 'none',
  } as any,
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  link: { color: colors.primaryBright, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
