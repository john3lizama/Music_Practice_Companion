import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { Button, GlassCard, H1, Muted, SectionLabel, Avatar, Stat } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { getProfile } from '../../src/api';
import { performances } from '../../src/mockData';
import type { UserProfile } from '../../src/mockData';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile().then(setUser);
  }, []);

  if (!user) {
    return (
      <Background>
        <View style={styles.center} testID="profile-loading">
          <ActivityIndicator color={colors.primaryBright} />
        </View>
      </Background>
    );
  }

  return (
    <Background testID="profile-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {/* Identity */}
        <GlassCard gradient style={{ alignItems: 'center', paddingVertical: spacing.xl }} testID="profile-header">
          <Avatar gradient={user.avatarGradient} size={88} label={user.name[0]} />
          <Text style={styles.name} testID="profile-name">{user.name}</Text>
          <Text style={styles.handle}>{user.handle}</Text>
          <Muted style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 420 }}>{user.bio}</Muted>
          <View style={styles.followRow}>
            <Stat value={user.followers.toLocaleString()} label="Followers" />
            <Stat value={user.following.toLocaleString()} label="Following" />
            <Stat value={`${user.songsLearned}`} label="Songs" />
          </View>
        </GlassCard>

        {/* Streak banner */}
        <LinearGradient colors={gradients.hero as unknown as string[]} style={styles.streak} testID="streak-banner">
          <Ionicons name="flame" size={28} color={colors.warning} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={styles.streakValue}>{user.streakDays}-day streak</Text>
            <Text style={styles.streakSub}>{user.minutesPracticed.toLocaleString()} minutes practiced all-time</Text>
          </View>
        </LinearGradient>

        {/* Badges */}
        <SectionLabel style={{ marginTop: spacing.xxl }}>Badges</SectionLabel>
        <View style={styles.badgeGrid} testID="badge-grid">
          {user.badges.map((b) => (
            <GlassCard key={b.id} style={styles.badge} testID={`badge-${b.id}`}>
              <LinearGradient colors={gradients.accent as unknown as string[]} style={styles.badgeIcon}>
                <Ionicons name={b.icon as any} size={20} color={colors.white} />
              </LinearGradient>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* My performances */}
        <SectionLabel style={{ marginTop: spacing.xxl }}>My performances</SectionLabel>
        <View style={{ marginTop: spacing.md }} testID="my-performances">
          {performances.slice(0, 3).map((p) => (
            <GlassCard key={p.id} style={styles.perfRow} testID={`my-perf-${p.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.perfTitle}>{p.songTitle}</Text>
                <Text style={styles.perfMeta}>{p.artist} · {p.instrument}</Text>
              </View>
              <Text style={styles.perfScore}>{p.overallScore}</Text>
            </GlassCard>
          ))}
        </View>

        <Button label="Sign out" variant="secondary" testID="sign-out" style={{ marginTop: spacing.xxl }} onPress={() => router.push('/(auth)/login')} />
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy, marginTop: spacing.md },
  handle: { color: colors.primaryBright, fontSize: fontSize.md, marginTop: 2 },
  followRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.xl },

  streak: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong },
  streakValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  streakSub: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  badge: { width: '47%', alignItems: 'center', paddingVertical: spacing.lg },
  badgeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  badgeLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' },

  perfRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  perfTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  perfMeta: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  perfScore: { color: colors.primaryBright, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
});
