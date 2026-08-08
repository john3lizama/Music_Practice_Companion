import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Background } from '../../src/components/Background';
import { Button, GlassCard, H1, H2, Muted, Pill, SectionLabel, ProgressBar, Waveform } from '../../src/components/ui';
import { ScoreDial, DeviationChart } from '../../src/components/charts';
import { colors, gradients, spacing, fontSize, fontWeight, radius } from '../../src/theme';
import { analyzeRecording, listAnalyses } from '../../src/api';
import type { AnalysisResult, Instrument } from '../../src/mockData';

const INSTRUMENTS: Instrument[] = ['Vocals', 'Guitar', 'Piano', 'Bass'];

// Optional native module: `npx expo install expo-document-picker`.
// Falls back to demo filenames if it isn't installed, so the screen
// (and any UI tests) keep working without the dependency.
let DocumentPicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DocumentPicker = require('expo-document-picker');
} catch {
  DocumentPicker = null;
}

type PickedFile = { uri: string; name?: string; mimeType?: string } | Blob;

export default function Analyze() {
  const [instrument, setInstrument] = useState<Instrument>('Vocals');
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  useEffect(() => {
    listAnalyses().then(setHistory);
  }, []);

  const pickDemoFile = () => {
    const samples = ['my_take_01.wav', 'chorus_practice.wav', 'verse_run.m4a'];
    setFileName(samples[Math.floor(Math.random() * samples.length)]);
    setFile(undefined);
    setResult(null);
    setError(null);
  };

  const pickFile = async () => {
    if (!DocumentPicker?.getDocumentAsync) {
      pickDemoFile();
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      // On web the picker exposes the real File (a Blob); on native we get a uri.
      setFile(asset.file ?? { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      setFileName(asset.name ?? 'recording.wav');
      setResult(null);
      setError(null);
    } catch {
      setError('Could not open the file picker.');
    }
  };

  const runAnalysis = async () => {
    if (!fileName) return;
    setAnalyzing(true);
    setResult(null);
    setError(null);
    try {
      const res = await analyzeRecording({ fileName, instrument, file });
      setResult(res);
      setHistory((h) => [res, ...h]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed — try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Background testID="analyze-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
        <SectionLabel>AI Feedback</SectionLabel>
        <H1 style={{ marginTop: spacing.xs }}>Analyze a recording</H1>
        <Muted style={{ marginTop: spacing.xs }}>Upload a take and get explainable scores for pitch, timing, and stability.</Muted>

        {/* Uploader */}
        <GlassCard gradient style={styles.uploader} testID="uploader">
          <Pressable testID="pick-file" onPress={pickFile} style={styles.dropZone}>
            <LinearGradient colors={gradients.accent as unknown as string[]} style={styles.uploadIcon}>
              <Ionicons name={fileName ? 'document-attach' : 'cloud-upload'} size={26} color={colors.white} />
            </LinearGradient>
            <Text style={styles.dropTitle} testID="file-name">{fileName ?? 'Choose an audio file'}</Text>
            <Muted style={{ textAlign: 'center', marginTop: 4 }}>{fileName ? 'Tap to choose a different file' : 'WAV or MP3 · tap to select'}</Muted>
          </Pressable>
          <Pressable testID="pick-demo-file" onPress={pickDemoFile} style={{ alignSelf: 'center', marginTop: spacing.sm }}>
            <Muted style={{ fontSize: fontSize.sm, textDecorationLine: 'underline' }}>or try a demo take</Muted>
          </Pressable>
          {error && (
            <Text style={{ color: colors.danger, marginTop: spacing.md, textAlign: 'center' }} testID="analyze-error">
              {error}
            </Text>
          )}

          <SectionLabel style={{ marginTop: spacing.lg }}>Instrument</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: spacing.md }}>
            {INSTRUMENTS.map((ins) => (
              <Pill key={ins} label={ins} active={instrument === ins} onPress={() => setInstrument(ins)} testID={`instrument-${ins.toLowerCase()}`} />
            ))}
          </ScrollView>

          <Button
            label={analyzing ? 'Analyzing…' : 'Run analysis'}
            size="lg"
            testID="run-analysis"
            disabled={!fileName || analyzing}
            onPress={runAnalysis}
            style={{ marginTop: spacing.md }}
          />
        </GlassCard>

        {/* Analyzing state */}
        {analyzing && (
          <View style={styles.analyzing} testID="analyzing-indicator">
            <Waveform bars={16} height={44} barWidth={5} gap={4} />
            <Muted style={{ marginTop: spacing.md }}>Listening… extracting pitch, onsets, and stability</Muted>
          </View>
        )}

        {/* Results */}
        {result && !analyzing && <ResultView result={result} />}

        {/* History */}
        <SectionLabel style={{ marginTop: spacing.xxl }}>Recent analyses</SectionLabel>
        <View style={{ marginTop: spacing.md }} testID="analysis-history">
          {history.map((a) => (
            <GlassCard key={a.id} style={styles.historyRow} testID={`history-${a.id}`}>
              <View style={styles.historyIcon}>
                <Ionicons name="musical-notes" size={18} color={colors.primaryBright} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyName} numberOfLines={1}>{a.fileName}</Text>
                <Text style={styles.historyMeta}>{a.instrument} · {new Date(a.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.historyScore}>{a.scores.overall}</Text>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </Background>
  );
}

function ResultView({ result }: { result: AnalysisResult }) {
  const { scores } = result;
  return (
    <View testID="analysis-result" style={{ marginTop: spacing.xl }}>
      <GlassCard gradient style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <ScoreDial value={scores.overall} label="Overall" testID="overall-dial" />
        <Text style={styles.resultFile}>{result.fileName}</Text>
      </GlassCard>

      {/* Score breakdown */}
      <View style={{ marginTop: spacing.lg }}>
        <ScoreBar label="Pitch accuracy" value={scores.pitchAccuracy} testID="score-pitch" />
        <ScoreBar label="Timing consistency" value={scores.timingConsistency} testID="score-timing" />
        {scores.vocalStability > 0 && <ScoreBar label="Vocal stability" value={scores.vocalStability} testID="score-stability" />}
      </View>

      {/* Plots */}
      <SectionLabel style={{ marginTop: spacing.xl }}>Pitch contour (cents off target)</SectionLabel>
      <View style={{ marginTop: spacing.sm }}>
        <DeviationChart data={result.pitchSeries.map((p) => ({ value: p.cents }))} maxAbs={50} unit="±50¢" testID="pitch-chart" />
      </View>

      <SectionLabel style={{ marginTop: spacing.lg }}>Onset timing (ms deviation)</SectionLabel>
      <View style={{ marginTop: spacing.sm }}>
        <DeviationChart data={result.onsetSeries.map((o) => ({ value: o.deviationMs }))} maxAbs={60} unit="±60ms" testID="onset-chart" />
      </View>

      {/* Feedback */}
      <SectionLabel style={{ marginTop: spacing.xl }}>Coaching tips</SectionLabel>
      <View style={{ marginTop: spacing.sm }} testID="feedback-list">
        {result.feedback.map((f, i) => (
          <GlassCard key={i} style={styles.tip} testID={`tip-${i}`}>
            <Ionicons name="bulb" size={18} color={colors.warning} style={{ marginTop: 2 }} />
            <Text style={styles.tipText}>{f}</Text>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

function ScoreBar({ label, value, testID }: { label: string; value: number; testID?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }} testID={testID}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreValue} testID={testID ? `${testID}-value` : undefined}>{value}</Text>
      </View>
      <ProgressBar value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  uploader: { marginTop: spacing.xl, padding: spacing.xl },
  dropZone: { alignItems: 'center', paddingVertical: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed' },
  uploadIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  dropTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },

  analyzing: { alignItems: 'center', paddingVertical: spacing.xxl },

  resultFile: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.md },
  scoreLabel: { color: colors.textMuted, fontSize: fontSize.md },
  scoreValue: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },

  tip: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start' },
  tipText: { color: colors.text, fontSize: fontSize.md, flex: 1, lineHeight: 22 },

  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  historyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  historyName: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  historyMeta: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  historyScore: { color: colors.primaryBright, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
});
