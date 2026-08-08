import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { BrandMark, Button, GlassCard, H1, Muted } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { register } from '../../src/api';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await register(email, password);
      router.replace('/home');
    } catch {
      setError('Please fill in all fields.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Background testID="register-screen">
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable testID="register-home" onPress={() => router.push('/')} style={styles.brand}>
          <BrandMark />
        </Pressable>

        <GlassCard gradient style={styles.card}>
          <H1>Create your account</H1>
          <Muted style={{ marginTop: spacing.xs }}>Start learning songs the smart way.</Muted>

          <Field label="Email" testID="register-email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field label="Password" testID="register-password" value={password} onChangeText={setPassword} placeholder="Create a password" secure />

          {error ? <Text style={styles.error} testID="register-error">{error}</Text> : null}

          <Button label={busy ? 'Creating…' : 'Create account'} size="lg" testID="register-submit" disabled={busy} onPress={submit} style={{ marginTop: spacing.lg }} />

          <View style={styles.switchRow}>
            <Muted>Already have an account?</Muted>
            <Pressable testID="go-login" onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.link}>Sign in</Text>
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
