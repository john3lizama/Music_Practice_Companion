import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { GlassCard, H2, Muted, SectionLabel } from '../../src/components/ui';
import { ProgressBar } from '../../src/components/ui';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { getSong } from '../../src/api';
import type { Song } from '../../src/mockData';

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
  const [pos, setPos] = useState(0); // seconds
  const [tempo, setTempo] = useState(100); // percent
  const [loop, setLoop] = useState(false);
  const [transpose, setTranspose] = useState(0); // semitones
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    getSong(id).then((s) => {
      setSong(s);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (playing && song) {
      timer.current = setInterval(() => {
        setPos((p) => {
          const next = p + 0.1 * (tempo / 100);
          if (next >= song.durationSec) {
            if (loop) return 0;
            setPlaying(false);
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
          <ProgressBar value={progress} testID="practice-progress" />

          <View style={styles.transport}>
            <Pressable testID="practice-restart" onPress={() => setPos(0)} style={styles.transportBtn}>
              <Ionicons name="play-skip-back" size={22} color={colors.text} />
            </Pressable>
            <Pressable testID="practice-play-toggle" onPress={() => setPlaying((p) => !p)}>
              <LinearGradient colors={gradients.accent as unknown as string[]} style={styles.playBig}>
                <Ionicons name={playing ? 'pause' : 'play'} size={30} color={colors.white} />
              </LinearGradient>
            </Pressable>
            <Pressable testID="practice-loop-toggle" onPress={() => setLoop((l) => !l)} style={[styles.transportBtn, loop && styles.transportActive]}>
              <Ionicons name="repeat" size={22} color={loop ? colors.primaryBright : colors.text} />
            </Pressable>
          </View>
          <Text style={styles.loopState} testID="practice-loop-state">{loop ? 'Loop on' : 'Loop off'}</Text>
        </GlassCard>

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
              <ProgressBar value={((tempo - 50) / 70) * 100} />
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
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.lg },
  transportBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  transportActive: { borderColor: colors.borderStrong, backgroundColor: colors.primarySoft },
  playBig: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  loopState: { color: colors.textFaint, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },

  controlCard: { marginTop: spacing.lg, padding: spacing.lg },
  controlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  controlLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  controlValue: { color: colors.primaryBright, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  transposeBig: { flex: 1, textAlign: 'center', color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy },
});
