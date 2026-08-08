import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, useWindowDimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../src/components/Background';
import { BrandMark, Button, GlassCard, H1, H2, Muted, SectionLabel, Pill, ProgressBar, Waveform } from '../src/components/ui';
import { ScoreDial } from '../src/components/charts';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../src/theme';

const FEATURES = [
  {
    id: 'catalog',
    icon: 'library' as const,
    label: 'CROWDSOURCED CATALOG',
    title: 'One canonical song graph',
    body: 'A community-built catalog of tabs, chords, and sheet music — quality-enforced by votes and verification. Every feature keys back to the same song entities.',
    accent: ['#7C3AED', '#2563EB'] as [string, string],
  },
  {
    id: 'practice',
    icon: 'musical-notes' as const,
    label: 'INTERACTIVE PRACTICE',
    title: 'Static notation becomes a tool',
    body: 'Playback, tempo control, looping, and transpose turn any chart into a practice instrument. Slow it down, loop the hard bar, change the key — all in one place.',
    accent: ['#A855F7', '#EC4899'] as [string, string],
  },
  {
    id: 'analyze',
    icon: 'pulse' as const,
    label: 'AI FEEDBACK',
    title: 'Data-driven coaching',
    body: 'Record yourself and get explainable scores for pitch accuracy, timing, and vocal stability — plus plain-English tips on exactly what to fix next.',
    accent: ['#8B5CF6', '#0EA5E9'] as [string, string],
  },
  {
    id: 'social',
    icon: 'people' as const,
    label: 'PERFORMANCE LAYER',
    title: 'Habit, discovery, identity',
    body: 'Share performances, earn streaks, and discover players learning the same songs. The social layer creates the loop that keeps you coming back.',
    accent: ['#F472B6', '#7C3AED'] as [string, string],
  },
];

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <Background testID="landing-root">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.huge }}>
        {/* Nav */}
        <View style={[styles.nav, { paddingHorizontal: wide ? 64 : 20 }]} testID="landing-nav">
          <BrandMark testID="brand-mark" />
          <View style={styles.navActions}>
            <Pressable testID="nav-sign-in" onPress={() => router.push('/(auth)/login')} style={styles.navLink}>
              <Text style={styles.navLinkText}>Sign in</Text>
            </Pressable>
            <Button label="Open App" size="sm" testID="nav-open-app" onPress={() => router.push('/home')} />
          </View>
        </View>

        {/* Hero */}
        <View style={[styles.hero, { paddingHorizontal: wide ? 64 : 20, flexDirection: wide ? 'row' : 'column' }]}>
          <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: rise }] }}>
            <Pill label="✦  Learn any song. Then master it." />
            <Text style={[styles.heroTitle, { fontSize: wide ? 64 : 42 }]} testID="hero-title">
              Turn notation into a{'\n'}
              <Text style={styles.heroAccent}>practice instrument.</Text>
            </Text>
            <Muted style={{ fontSize: fontSize.lg, maxWidth: 520, marginTop: spacing.lg }}>
              A crowdsourced catalog, interactive playback, AI feedback, and a social layer — all built on one
              canonical song graph.
            </Muted>
            <View style={styles.heroCtas}>
              <Button label="Start practicing" size="lg" testID="hero-cta-primary" onPress={() => router.push('/home')} />
              <Button
                label="Explore catalog"
                size="lg"
                variant="secondary"
                testID="hero-cta-secondary"
                onPress={() => router.push('/home')}
              />
            </View>
            <View style={styles.heroStats}>
              <HeroStat value="Pitch" label="tracked" />
              <HeroStat value="Timing" label="scored" />
              <HeroStat value="Coaching" label="explained" />
            </View>
          </Animated.View>

          {/* Floating preview card */}
          <Animated.View
            style={{ flex: wide ? 0.9 : undefined, opacity: fade, transform: [{ translateY: rise }], marginTop: wide ? 0 : spacing.xxxl }}
          >
            <GlassCard gradient glow style={styles.previewCard} testID="hero-preview">
              <View style={styles.previewHeader}>
                <View>
                  <Text style={styles.previewSong}>Wonderwall</Text>
                  <Text style={styles.previewArtist}>Oasis · F#m · 87 BPM</Text>
                </View>
                <ScoreDial value={82} size={96} label="Pitch" testID="preview-dial" />
              </View>
              <View style={{ marginTop: spacing.lg }}>
                <RowLabel label="Timing consistency" value="74%" />
                <ProgressBar value={74} />
              </View>
              <View style={{ marginTop: spacing.md }}>
                <RowLabel label="Vocal stability" value="68%" />
                <ProgressBar value={68} />
              </View>
              <View style={styles.previewFooter}>
                <View style={styles.previewControls}>
                  <Ionicons name="play-back" size={18} color={colors.textMuted} />
                  <LinearGradient colors={gradients.accent as unknown as string[]} style={styles.playBtn}>
                    <Ionicons name="play" size={20} color={colors.white} />
                  </LinearGradient>
                  <Ionicons name="repeat" size={18} color={colors.primaryBright} />
                </View>
                <Waveform bars={10} height={30} />
              </View>
            </GlassCard>
          </Animated.View>
        </View>

        {/* Feature sections */}
        <View style={{ paddingHorizontal: wide ? 64 : 20, marginTop: spacing.huge }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
            <SectionLabel>Everything in one loop</SectionLabel>
            <H1 style={{ fontSize: wide ? 40 : 30, textAlign: 'center', marginTop: spacing.sm }}>
              Four features. One song graph.
            </H1>
          </View>

          <View style={[styles.featureGrid, { flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap' }]}>
            {FEATURES.map((f) => (
              <View key={f.id} style={[styles.featureCol, { width: wide ? '48%' : '100%' }]}>
                <GlassCard style={styles.featureCard} testID={`feature-${f.id}`}>
                  <LinearGradient colors={f.accent} style={styles.featureIcon}>
                    <Ionicons name={f.icon} size={22} color={colors.white} />
                  </LinearGradient>
                  <SectionLabel style={{ marginTop: spacing.lg }}>{f.label}</SectionLabel>
                  <H2 style={{ marginTop: spacing.sm }}>{f.title}</H2>
                  <Muted style={{ marginTop: spacing.sm }}>{f.body}</Muted>
                </GlassCard>
              </View>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={{ paddingHorizontal: wide ? 64 : 20, marginTop: spacing.huge }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
            <SectionLabel>How it works</SectionLabel>
            <H1 style={{ fontSize: wide ? 40 : 30, textAlign: 'center', marginTop: spacing.sm }}>
              From "I want to learn this" to mastery
            </H1>
          </View>
          <View style={[styles.steps, { flexDirection: wide ? 'row' : 'column' }]}>
            {[
              { n: '01', t: 'Find the song', d: 'Search the catalog and pick a community-verified notation.' },
              { n: '02', t: 'Practice it', d: 'Loop, slow down, and transpose until the hard parts click.' },
              { n: '03', t: 'Get feedback', d: 'Record a take and see exactly where to improve next.' },
            ].map((s) => (
              <GlassCard key={s.n} style={[styles.stepCard, { width: wide ? '32%' : '100%' }]} testID={`step-${s.n}`}>
                <Text style={styles.stepNum}>{s.n}</Text>
                <H2 style={{ marginTop: spacing.sm }}>{s.t}</H2>
                <Muted style={{ marginTop: spacing.xs }}>{s.d}</Muted>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* Footer CTA */}
        <View style={{ paddingHorizontal: wide ? 64 : 20, marginTop: spacing.huge }}>
          <LinearGradient colors={gradients.hero as unknown as string[]} style={styles.footerCta} testID="footer-cta">
            <H1 style={{ fontSize: wide ? 44 : 30, textAlign: 'center' }}>Ready to actually finish a song?</H1>
            <Muted style={{ textAlign: 'center', marginTop: spacing.md, maxWidth: 480 }}>
              Jump into the app and try every feature with live demo data.
            </Muted>
            <Button label="Open the app" size="lg" testID="footer-open-app" style={{ marginTop: spacing.xl }} onPress={() => router.push('/home')} />
          </LinearGradient>
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <BrandMark size="sm" />
          </View>
          <View style={styles.footerLinks}>
            <Pressable testID="footer-privacy" onPress={() => router.push('/legal/privacy')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable testID="footer-terms" onPress={() => router.push('/legal/terms')}>
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
          </View>
          <Text style={styles.footerNote}>MusicVJN · Built by John Lizama · George Mason University · Research preview</Text>
        </View>
      </ScrollView>
    </Background>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ marginRight: spacing.xxl }}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function RowLabel({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowLabel}>
      <Text style={styles.rowLabelText}>{label}</Text>
      <Text style={styles.rowLabelValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLink: { paddingVertical: 8, paddingHorizontal: 6 },
  navLinkText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: fontWeight.medium },

  hero: { marginTop: spacing.xxxl, gap: spacing.xxxl, alignItems: 'center' },
  heroTitle: { color: colors.text, fontWeight: fontWeight.heavy, letterSpacing: -1.5, lineHeight: undefined, marginTop: spacing.lg },
  heroAccent: {
    color: colors.primaryBright,
    textShadowColor: 'rgba(34,211,238,0.55)',
    textShadowRadius: 28,
    textShadowOffset: { width: 0, height: 0 },
  },
  heroCtas: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, flexWrap: 'wrap' },
  heroStats: { flexDirection: 'row', marginTop: spacing.xxxl },
  heroStatValue: { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy },
  heroStatLabel: { color: colors.textFaint, fontSize: fontSize.sm, marginTop: 2 },

  previewCard: { width: '100%', maxWidth: 420, padding: spacing.xl },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewSong: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  previewArtist: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl },
  previewControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  playBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  rowLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabelText: { color: colors.textMuted, fontSize: fontSize.sm },
  rowLabelValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  featureGrid: { gap: spacing.lg, justifyContent: 'space-between' },
  featureCol: { marginBottom: spacing.lg },
  featureCard: { minHeight: 220, padding: spacing.xl },
  featureIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  steps: { gap: spacing.lg, justifyContent: 'space-between' },
  stepCard: { marginBottom: spacing.lg, padding: spacing.xl },
  stepNum: { color: colors.primaryBright, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy, letterSpacing: -1 },

  footerCta: {
    borderRadius: radius.xl,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: spacing.md },
  footerLink: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  footerDot: { color: colors.textFaint },
  footerNote: { color: colors.textFaint, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.md },
});
