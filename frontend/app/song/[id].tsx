import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { Button, GlassCard, H1, H2, Muted, Pill, SectionLabel, Stat } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { getSong } from '../../src/api';
import { useArtwork } from '../../src/artwork';
import type { Song, Notation } from '../../src/mockData';

export default function SongDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [song, setSong] = useState<Song | undefined>();
  const [loading, setLoading] = useState(true);
  const [selectedNotation, setSelectedNotation] = useState<string | null>(null);
  const artwork = useArtwork(song?.title ?? '', song?.artist ?? '');

  useEffect(() => {
    if (!id) return;
    getSong(id).then((s) => {
      setSong(s);
      setSelectedNotation(s?.notations[0]?.id ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <Background>
        <View style={styles.center} testID="song-loading">
          <ActivityIndicator color={colors.primaryBright} />
        </View>
      </Background>
    );
  }

  if (!song) {
    return (
      <Background>
        <View style={styles.center} testID="song-notfound">
          <Muted>Song not found.</Muted>
          <Button label="Back to catalog" variant="secondary" style={{ marginTop: spacing.lg }} onPress={() => router.push('/home')} />
        </View>
      </Background>
    );
  }

  return (
    <Background testID="song-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
        {/* Hero header */}
        <LinearGradient colors={song.coverGradient} style={styles.header}>
          {artwork && (
            <>
              <Image source={{ uri: artwork }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={28} />
              <View style={styles.headerDim} pointerEvents="none" />
            </>
          )}
          <Pressable testID="song-back" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.headerRow}>
            {artwork && (
              <Image
                source={{ uri: artwork }}
                style={styles.headerArt}
                resizeMode="cover"
                accessibilityLabel={`${song.title} album artwork`}
              />
            )}
            <View style={styles.headerContent}>
              <SectionLabel style={{ color: 'rgba(255,255,255,0.85)' }}>{song.genres.join(' · ')}</SectionLabel>
              <Text style={styles.headerTitle} testID="song-title">{song.title}</Text>
              <Text style={styles.headerArtist}>{song.artist} · {song.album} · {song.year}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.xl }}>
          {/* Quick stats */}
          <GlassCard style={styles.statsCard}>
            <Stat value={song.key} label="Key" />
            <Stat value={`${song.bpm}`} label="BPM" />
            <Stat value={song.difficulty} label="Level" />
            <Stat value={`${(song.learners / 1000).toFixed(1)}k`} label="Learning" />
          </GlassCard>

          {/* Primary actions */}
          <View style={styles.actions}>
            <Button label="Open practice player" size="lg" iconLeft={<Ionicons name="play" size={18} color={colors.white} />} testID="open-practice" style={{ flex: 1 }} onPress={() => router.push(`/practice/${song.id}`)} />
            <Button label="Analyze a take" size="lg" variant="secondary" testID="open-analyze-from-song" onPress={() => router.push('/analyze')} />
          </View>

          {/* Progression preview */}
          <SectionLabel style={{ marginTop: spacing.xxl }}>Chord progression</SectionLabel>
          <View style={styles.progRow}>
            {song.progression.map((p, i) => (
              <GlassCard key={i} style={styles.progCard} testID={`prog-${i}`}>
                <Text style={styles.progRoman}>{p.label}</Text>
                <Text style={styles.progChord}>{p.chord}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Notations */}
          <SectionLabel style={{ marginTop: spacing.xxl }}>Community notations</SectionLabel>
          <Muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>Crowdsourced and quality-ranked by votes.</Muted>
          <View testID="notation-list">
            {song.notations.map((n) => (
              <NotationRow key={n.id} notation={n} selected={selectedNotation === n.id} onSelect={() => setSelectedNotation(n.id)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </Background>
  );
}

function NotationRow({ notation, selected, onSelect }: { notation: Notation; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable testID={`notation-${notation.id}`} onPress={onSelect}>
      <GlassCard style={[styles.notationRow, selected && styles.notationSelected]}>
        <View style={styles.notationIcon}>
          <Ionicons
            name={notation.type === 'Tab' ? 'git-commit' : notation.type === 'Chords' ? 'grid' : 'document-text'}
            size={18}
            color={colors.primaryBright}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.notationType}>{notation.type}</Text>
            {notation.verified && <Ionicons name="checkmark-circle" size={15} color={colors.success} />}
          </View>
          <Text style={styles.notationBy}>by {notation.contributor} · updated {notation.updatedAt}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.notationRating}>★ {notation.rating.toFixed(1)}</Text>
          <Text style={styles.notationVotes}>{notation.votes.toLocaleString()} votes</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
  headerDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,13,0.55)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xl, marginTop: spacing.xl },
  headerArt: { width: 128, height: 128, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  headerContent: { flex: 1 },
  headerTitle: { color: colors.white, fontSize: 38, fontWeight: fontWeight.heavy, letterSpacing: -1, marginTop: spacing.sm },
  headerArtist: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.md, marginTop: spacing.xs },

  statsCard: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, flexWrap: 'wrap' },

  progRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' },
  progCard: { alignItems: 'center', paddingVertical: spacing.lg, minWidth: 84, flex: 1 },
  progRoman: { color: colors.textFaint, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  progChord: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 4 },

  notationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  notationSelected: { borderColor: colors.borderStrong, backgroundColor: colors.primarySoft },
  notationIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  notationType: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  notationBy: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  notationRating: { color: colors.primaryBright, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  notationVotes: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
});
