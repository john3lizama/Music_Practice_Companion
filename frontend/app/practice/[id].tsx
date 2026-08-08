import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Background } from '../../src/components/Background';
import { GlassCard, H2, Muted, SectionLabel, Seekbar } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { getSong } from '../../src/api';
import type { Song } from '../../src/mockData';
import { PAD_ASSETS, PAD_LOOP_DURATION_SEC } from '../../src/audio';
import { getLyrics, type LyricWord } from '../../src/lyrics';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeKey(key: string, semitones: number): string {
  const minor = key.endsWith('m');
  const root = minor ? key.slice(0, -1) : key;
  const idx = NOTES.indexOf(root);
  if (idx === -1) return key;
  const next = NOTES[(idx + semitones + 120) % 12];
  return minor ? `${next}m` : next;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PracticePlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [song, setSong] = useState<Song | undefined>();
  const [loading, setLoading] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // seconds, virtual position along the full track
  const [tempo, setTempo] = useState(100); // percent
  const [loop, setLoop] = useState(false);
  const [transpose, setTranspose] = useState(0); // semitones
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!id) return;
    getSong(id).then((s) => {
      setSong(s);
      setLoading(false);
    });
  }, [id]);

  // Load the song's placeholder audio pad. It's a short (16s) seamless loop
  // played under the hood — play/pause/rate track the real Audio.Sound, while
  // `pos` drives a full-length virtual timeline built from the song's
  // declared duration, so scrubbing/skipping feel like a real track.
  useEffect(() => {
    let cancelled = false;
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    if (!song) return undefined;

    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(PAD_ASSETS[song.pad], {
          isLooping: true,
          volume: 0.5,
        });
        if (cancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
      } catch {
        // Audio unavailable in this environment (e.g. some test runners) —
        // the visual player, seeking, and lyrics still work without sound.
      }
    })();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [song]);

  useEffect(() => {
    soundRef.current?.setRateAsync(tempo / 100, true).catch(() => {});
  }, [tempo]);

  useEffect(() => {
    if (playing && song) {
      timer.current = setInterval(() => {
        setPos((p) => {
          const next = p + 0.1 * (tempo / 100);
          if (next >= song.durationSec) {
            if (loop) {
              soundRef.current?.setPositionAsync(0).catch(() => {});
              return 0;
            }
            setPlaying(false);
            soundRef.current?.pauseAsync().catch(() => {});
            return song.durationSec;
          }
          return next;
        });
      }, 100);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, tempo, loop, song]);

  const togglePlay = async () => {
    const sound = soundRef.current;
    const next = !playing;
    setPlaying(next);
    if (!sound) return;
    try {
      if (next) await sound.playAsync();
      else await sound.pauseAsync();
    } catch {
      // ignore — position/lyrics keep working without sound.
    }
  };

  const seekTo = (sec: number) => {
    if (!song) return;
    const clamped = Math.max(0, Math.min(song.durationSec, sec));
    setPos(clamped);
    soundRef.current?.setPositionAsync((clamped % PAD_LOOP_DURATION_SEC) * 1000).catch(() => {});
  };

  const lyrics = useMemo(() => (song ? getLyrics(song.id, song.durationSec) : []), [song]);
  const activeLyricIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= pos) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, pos]);

  if (loading || !song) {
    return (
      <Background>
        <View style={styles.center} testID="practice-loading">
          <ActivityIndicator color={colors.primaryBright} />
        </View>
      </Background>
    );
  }

  const progress = (pos / song.durationSec) * 100;
  const activeBeat = Math.floor((pos / song.durationSec) * song.progression.length) % song.progression.length;

  return (
    <Background testID="practice-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingTop: 56, paddingBottom: 80, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <Pressable testID="practice-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <SectionLabel style={{ marginTop: spacing.lg }}>Practice player</SectionLabel>
        <H2 testID="practice-song-title" style={{ marginTop: spacing.xs }}>{song.title}</H2>
        <Muted>{song.artist} · original key {song.key} · {song.bpm} BPM</Muted>

        {/* Progression strip with playhead */}
        <GlassCard gradient style={{ marginTop: spacing.xl, padding: spacing.lg }}>
          <View style={styles.beatRow}>
            {song.progression.map((p, i) => {
              const active = i === activeBeat && playing;
              return (
                <View key={i} style={[styles.beat, active && styles.beatActive]} testID={`beat-${i}`}>
                  <Text style={[styles.beatChord, active && { color: colors.white }]}>
                    {transposeKey(p.chord.replace(/[^A-G#m]/g, '').slice(0, 2) || p.chord, transpose)}
                  </Text>
                  <Text style={styles.beatRoman}>{p.label}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Transport */}
        <GlassCard style={{ marginTop: spacing.lg, padding: spacing.lg }}>
          <View style={styles.timeRow}>
            <Text style={styles.time} testID="practice-position">{fmt(pos)}</Text>
            <Text style={styles.timeFaint}>{fmt(song.durationSec)}</Text>
          </View>
          <Seekbar
            value={progress}
            testID="practice-progress"
            onSeek={(percent) => setPos((percent / 100) * song.durationSec)}
            onSeekEnd={(percent) => seekTo((percent / 100) * song.durationSec)}
          />

          <View style={styles.transport}>
            <Pressable testID="practice-restart" onPress={() => seekTo(0)} style={styles.transportBtn}>
              <Ionicons name="play-skip-back" size={22} color={colors.text} />
            </Pressable>
            <Pressable testID="skip-back" onPress={() => seekTo(pos - 10)} style={styles.transportBtn}>
              <Ionicons name="play-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable testID="practice-play-toggle" onPress={togglePlay}>
              <LinearGradient colors={gradients.accent as unknown as string[]} style={styles.playBig}>
                <Ionicons name={playing ? 'pause' : 'play'} size={30} color={colors.white} />
              </LinearGradient>
            </Pressable>
            <Pressable testID="skip-forward" onPress={() => seekTo(pos + 10)} style={styles.transportBtn}>
              <Ionicons name="play-forward" size={20} color={colors.text} />
            </Pressable>
            <Pressable testID="practice-loop-toggle" onPress={() => setLoop((l) => !l)} style={[styles.transportBtn, loop && styles.transportActive]}>
              <Ionicons name="repeat" size={22} color={loop ? colors.primaryBright : colors.text} />
            </Pressable>
          </View>
          <Text style={styles.loopState} testID="practice-loop-state">{loop ? 'Loop on' : 'Loop off'}</Text>
        </GlassCard>

        {/* Lyrics */}
        <LyricsPanel words={lyrics} activeIndex={activeLyricIndex} onWordPress={seekTo} />

        {/* Tempo control */}
        <GlassCard style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="speedometer" size={18} color={colors.primaryBright} />
              <Text style={styles.controlLabel}>Tempo</Text>
            </View>
            <Text style={styles.controlValue} testID="tempo-value">{tempo}% · {Math.round((song.bpm * tempo) / 100)} BPM</Text>
          </View>
          <View style={styles.stepper}>
            <Stepper testID="tempo-down" icon="remove" onPress={() => setTempo((t) => Math.max(50, t - 5))} />
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <SimpleBar value={((tempo - 50) / 70) * 100} />
            </View>
            <Stepper testID="tempo-up" icon="add" onPress={() => setTempo((t) => Math.min(120, t + 5))} />
          </View>
        </GlassCard>

        {/* Transpose control */}
        <GlassCard style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="swap-vertical" size={18} color={colors.primaryBright} />
              <Text style={styles.controlLabel}>Transpose</Text>
            </View>
            <Text style={styles.controlValue} testID="transpose-value">
              {transpose > 0 ? `+${transpose}` : transpose} st · key {transposeKey(song.key, transpose)}
            </Text>
          </View>
          <View style={styles.stepper}>
            <Stepper testID="transpose-down" icon="remove" onPress={() => setTranspose((t) => Math.max(-6, t - 1))} />
            <Text style={styles.transposeBig} testID="transpose-key">{transposeKey(song.key, transpose)}</Text>
            <Stepper testID="transpose-up" icon="add" onPress={() => setTranspose((t) => Math.min(6, t + 1))} />
          </View>
        </GlassCard>
      </ScrollView>
    </Background>
  );
}

function Stepper({ icon, onPress, testID }: { icon: any; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.stepBtn}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

// Non-interactive bar for the tempo stepper (Seekbar is reserved for actual
// track scrubbing so its click/drag handling doesn't fire from here).
function SimpleBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.simpleBarTrack}>
      <View style={[styles.simpleBarFill, { width: `${clamped}%` }]} />
    </View>
  );
}

function LyricsPanel({
  words,
  activeIndex,
  onWordPress,
}: {
  words: LyricWord[];
  activeIndex: number;
  onWordPress: (time: number) => void;
}) {
  const lines: LyricWord[][] = [];
  words.forEach((w) => {
    if (!lines[w.line]) lines[w.line] = [];
    lines[w.line].push(w);
  });

  let globalIndex = -1;
  return (
    <GlassCard style={{ marginTop: spacing.lg, padding: spacing.lg }} testID="lyrics-panel">
      <SectionLabel>Lyrics</SectionLabel>
      <Muted style={{ marginTop: 2 }}>Tap a word to jump there</Muted>
      <View style={{ marginTop: spacing.md }}>
        {lines.map((line, li) => (
          <View key={li} style={styles.lyricLine}>
            {line.map((w) => {
              globalIndex += 1;
              const i = globalIndex;
              const active = i === activeIndex;
              return (
                <Pressable key={i} testID={`lyric-word-${i}`} onPress={() => onWordPress(w.time)} hitSlop={4}>
                  <Text style={[styles.lyricWord, active && styles.lyricWordActive]}>{w.text} </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },

  beatRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  beat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)' },
  beatActive: { backgroundColor: colors.primaryDeep },
  beatChord: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  beatRoman: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },

  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  time: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  timeFaint: { color: colors.textFaint, fontSize: fontSize.sm },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.lg },
  transportBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  transportActive: { borderColor: colors.borderStrong, backgroundColor: colors.primarySoft },
  playBig: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  loopState: { color: colors.textFaint, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },

  lyricLine: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  lyricWord: { color: colors.textFaint, fontSize: fontSize.md, lineHeight: 26 },
  lyricWordActive: { color: colors.primaryBright, fontWeight: fontWeight.bold },

  controlCard: { marginTop: spacing.lg, padding: spacing.lg },
  controlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  controlLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  controlValue: { color: colors.primaryBright, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  transposeBig: { flex: 1, textAlign: 'center', color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy },

  simpleBarTrack: { width: '100%', height: 8, borderRadius: 8, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  simpleBarFill: { height: '100%', borderRadius: 8, backgroundColor: colors.primaryBright },
});
