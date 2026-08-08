import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { BrandMark, Button, GlassCard, H1, Muted } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { login } from '../../src/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/home');
    } catch {
      setError('Please enter an email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Background testID="login-screen">
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable testID="login-home" onPress={() => router.push('/')} style={styles.brand}>
          <BrandMark />
        </Pressable>

        <GlassCard gradient style={styles.card}>
          <H1>Welcome back</H1>
          <Muted style={{ marginTop: spacing.xs }}>Sign in to continue practicing.</Muted>

          <Field label="Email" testID="login-email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field label="Password" testID="login-password" value={password} onChangeText={setPassword} placeholder="••••••••" secure />

          {error ? <Text style={styles.error} testID="login-error">{error}</Text> : null}

          <Pressable testID="go-forgot" onPress={() => router.push('/(auth)/forgot')} style={{ alignSelf: 'flex-end', marginTop: spacing.sm }}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>

          <Button label={busy ? 'Signing in…' : 'Sign in'} size="lg" testID="login-submit" disabled={busy} onPress={submit} style={{ marginTop: spacing.lg }} />

          <View style={styles.switchRow}>
            <Muted>New here?</Muted>
            <Pressable testID="go-register" onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </View>
        </GlassCard>
      </ScrollView>
    </Background>
  );
}

function Field({ label, secure, testID, ...props }: any) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        secureTextEntry={secure}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  card: { width: '100%', maxWidth: 420, padding: spacing.xl },
  fieldLabel: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: 6 },
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
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  link: { color: colors.primaryBright, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
