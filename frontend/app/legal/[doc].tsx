import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Background } from '../../src/components/Background';
import { BrandMark, H1, H2, Muted } from '../../src/components/ui';
import { colors, spacing, fontSize } from '../../src/theme';

const UPDATED = 'July 1, 2026';

const PRIVACY: [string, string][] = [
  ['What we collect', 'Your email and password (stored only as a salted hash — we never see your actual password). Audio recordings you upload for analysis, and the scores, feedback, and plots generated from them.'],
  ['How we use it', 'To run your recordings through the analysis pipeline, show you your practice history, and let you sign in. We do not sell your data or use your recordings to train models without explicit, separate consent.'],
  ['Storage and retention', 'Data is stored on our own servers. You can delete any analysis session at any time, which removes its audio and results. Deleting your account removes your recordings and profile.'],
  ['Third parties', 'Album artwork is fetched from Apple’s iTunes Search API. Password-reset emails are sent through our email provider. We use error monitoring to keep the service reliable. None of these receive your recordings.'],
  ['Your rights', 'You can access, export, or delete your data. Email us and we’ll help. This is a research preview — treat it accordingly and don’t upload anything you consider sensitive.'],
  ['Contact', 'Questions about privacy: john3lizama@gmail.com.'],
];

const TERMS: [string, string][] = [
  ['Acceptance', 'By using MusicVJN you agree to these terms. If you don’t agree, don’t use the service.'],
  ['The service', 'MusicVJN analyzes recordings you upload and returns automated feedback. It is provided “as is,” as a research preview, without warranties. Scores and coaching are informational, not professional instruction.'],
  ['Your content', 'You keep ownership of what you upload. You confirm you have the right to upload it. Do not upload copyrighted recordings you don’t own the rights to, or anything unlawful. You grant us the limited right to process your uploads to provide the service.'],
  ['Acceptable use', 'Don’t abuse, overload, reverse-engineer, or attempt to breach the service, and don’t upload malware or others’ private recordings without permission.'],
  ['Accounts', 'You’re responsible for keeping your login secure and for activity under your account.'],
  ['Liability', 'To the maximum extent permitted by law, MusicVJN and its creator aren’t liable for damages arising from use of the service. It may change or shut down at any time during the preview.'],
  ['Contact', 'Questions about these terms: john3lizama@gmail.com.'],
];

export default function Legal() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const isPrivacy = doc !== 'terms';
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <Background testID="legal-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 80, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <Pressable testID="legal-back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={{ marginTop: spacing.lg }}>
          <BrandMark />
        </View>

        <H1 style={{ marginTop: spacing.xl }} testID="legal-title">
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </H1>
        <Muted style={{ marginTop: spacing.xs }}>Last updated {UPDATED}</Muted>

        {sections.map(([title, body]) => (
          <View key={title} style={{ marginTop: spacing.xl }}>
            <H2>{title}</H2>
            <Muted style={{ marginTop: spacing.xs }}>{body}</Muted>
          </View>
        ))}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.textMuted, fontSize: fontSize.md },
});
