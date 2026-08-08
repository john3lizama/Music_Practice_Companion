import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { GlassCard, H1, Muted, Pill, SectionLabel, Waveform } from '../../src/components/ui';
import { colors, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { listSongs } from '../../src/api';
import { useArtwork } from '../../src/artwork';
import type { Song, Instrument } from '../../src/mockData';

const FILTERS: ('All' | Instrument)[] = ['All', 'Guitar', 'Vocals', 'Piano', 'Bass'];

export default function Discover() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | Instrument>('All');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listSongs(query).then((res) => {
      if (active) {
        setSongs(res);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [query]);

  const filtered = useMemo(
    () => (filter === 'All' ? songs : songs.filter((s) => s.instruments.includes(filter))),
    [songs, filter],
  );

  return (
    <Background testID="discover-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, maxWidth: 1200, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <SectionLabel>Discover</SectionLabel>
            <H1 style={{ marginTop: spacing.xs }}>Find your next song</H1>
            <Muted style={{ marginTop: spacing.xs }}>Search the crowdsourced catalog of community-verified notation.</Muted>
          </View>
          <Waveform bars={9} height={36} />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs, artists, genres…"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable testID="search-clear" onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pill key={f} label={f} active={filter === f} onPress={() => setFilter(f)} testID={`filter-${f.toLowerCase()}`} />
          ))}
        </ScrollView>

        {/* Results */}
        {loading ? (
          <View style={styles.loading} testID="discover-loading">
            <ActivityIndicator color={colors.primaryBright} />
            <Muted style={{ marginTop: spacing.md }}>Loading catalog…</Muted>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.loading} testID="discover-empty">
            <Ionicons name="sad-outline" size={28} color={colors.textFaint} />
            <Muted style={{ marginTop: spacing.md }}>No songs match your search.</Muted>
          </View>
        ) : (
          <View style={[styles.grid, { marginTop: spacing.xl }]} testID="song-grid">
            {filtered.map((song) => (
              <View key={song.id} style={{ width: cols === 1 ? '100%' : cols === 2 ? '48.5%' : '32%' }}>
                <SongCard song={song} onPress={() => router.push(`/song/${song.id}`)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

function SongCard({ song, onPress }: { song: Song; onPress: () => void }) {
  const topNotation = [...song.notations].sort((a, b) => b.rating - a.rating)[0];
  const artwork = useArtwork(song.title, song.artist);
  return (
    <Pressable testID={`song-card-${song.id}`} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      <GlassCard style={styles.songCard}>
        <LinearGradient colors={song.coverGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
          {artwork ? (
            <Image
              source={{ uri: artwork }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityLabel={`${song.title} album artwork`}
            />
          ) : (
            <Ionicons name="musical-notes" size={28} color="rgba(255,255,255,0.9)" />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
            style={styles.coverScrim}
            pointerEvents="none"
          />
          <View style={styles.coverBadge}>
            <Text style={styles.coverBadgeText}>{song.difficulty}</Text>
          </View>
          <View style={styles.coverText} pointerEvents="none">
            <Text style={styles.coverTitle} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.coverArtist} numberOfLines={1}>{song.artist} · {song.album}</Text>
          </View>
        </LinearGradient>
        <View style={styles.songMeta}>
          <Meta icon="key" text={song.key} />
          <Meta icon="speedometer" text={`${song.bpm} BPM`} />
          {topNotation?.verified && <Meta icon="checkmark-circle" text="Verified" color={colors.success} />}
        </View>
        <View style={styles.songStats}>
          <Text style={styles.songStat}>★ {topNotation ? topNotation.rating.toFixed(1) : '—'}</Text>
          <Text style={styles.songStatFaint}>{(song.learners / 1000).toFixed(1)}k learning</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function Meta({ icon, text, color }: { icon: any; text: string; color?: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={color ?? colors.textMuted} />
      <Text style={[styles.metaText, color ? { color } : null]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 50,
    marginTop: spacing.xl,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.md, outlineStyle: 'none' } as any,
  filterRow: { gap: 10, paddingVertical: spacing.lg },
  loading: { alignItems: 'center', paddingVertical: spacing.huge },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '1.5%', justifyContent: 'flex-start' } as any,
  songCard: { padding: spacing.md, marginBottom: spacing.lg },
  cover: { height: 150, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  coverText: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  coverTitle: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  coverArtist: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs, marginTop: 1 },
  coverBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  coverBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  songTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  songArtist: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  songMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textMuted, fontSize: fontSize.xs },
  songStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  songStat: { color: colors.primaryBright, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  songStatFaint: { color: colors.textFaint, fontSize: fontSize.xs },
});
