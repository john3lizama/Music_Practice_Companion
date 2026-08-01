import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fontWeight, motion, radius } from '../theme';

/**
 * Circular score dial. On web it uses a conic-gradient for a true arc (the
 * primary Playwright target). On native it falls back to a gradient ring.
 * The arc sweeps in and the number counts up when it mounts.
 */
export function ScoreDial({
  value,
  size = 132,
  label = 'Overall',
  testID,
}: {
  value: number; // 0-100
  size?: number;
  label?: string;
  testID?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const ringColor = clamped >= 85 ? colors.success : clamped >= 70 ? colors.primaryBright : colors.warning;
  const hole = size * 0.74;

  const [shown, setShown] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sub = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, {
      toValue: clamped,
      duration: motion.slow + 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(sub);
  }, [anim, clamped]);

  const deg = (shown / 100) * 360;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            // @ts-ignore web-only conic gradient for the arc fill
            backgroundImage: `conic-gradient(${ringColor} ${deg}deg, rgba(255,255,255,0.06) ${deg}deg 360deg)`,
            backgroundColor: 'rgba(255,255,255,0.06)',
            // @ts-ignore web-only soft glow matching the ring color
            boxShadow: `0 0 ${size * 0.28}px rgba(139,92,246,0.25)`,
          },
        ]}
      >
        <View
          style={{
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            backgroundColor: colors.bgElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[styles.dialValue, { color: ringColor }]} testID={testID ? `${testID}-value` : undefined}>
            {shown}
          </Text>
          <Text style={styles.dialLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Deviation chart — renders a baseline with bars above/below it. Used for the
 * pitch contour (cents) and onset timing (ms) plots.
 */
export function DeviationChart({
  data,
  maxAbs,
  unit,
  height = 140,
  testID,
}: {
  data: { value: number }[];
  maxAbs: number;
  unit: string;
  height?: number;
  testID?: string;
}) {
  const half = height / 2;
  return (
    <View style={[styles.chart, { height }]} testID={testID}>
      <View style={[styles.baseline, { top: half }]} />
      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const ratio = Math.max(-1, Math.min(1, d.value / maxAbs));
          const barH = Math.abs(ratio) * (half - 6);
          const positive = ratio >= 0;
          return (
            <View key={i} style={styles.barSlot}>
              <View
                style={{
                  position: 'absolute',
                  top: positive ? half - barH : half,
                  height: Math.max(barH, 1),
                  width: '64%',
                  borderRadius: 3,
                  backgroundColor: positive ? colors.primaryBright : colors.aurora,
                  opacity: 0.85,
                }}
              />
            </View>
          );
        })}
      </View>
      <Text style={styles.chartUnit}>{unit}</Text>
    </View>
  );
}

/** Small sparkbar group that pulses like a live signal (equalizer motion). */
export function MiniBars({ values, testID }: { values: number[]; testID?: string }) {
  return (
    <View style={styles.miniRow} testID={testID}>
      {values.map((v, i) => (
        <MiniBar key={i} height={8 + v * 0.4} delay={(i * 130) % 640} />
      ))}
    </View>
  );
}

function MiniBar({ height, delay }: { height: number; delay: number }) {
  const s = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(s, {
          toValue: 1,
          duration: 420 + (delay % 200),
          delay,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(s, {
          toValue: 0.4,
          duration: 460 + (delay % 160),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [s, delay]);
  return (
    <View style={{ height: 28, width: 6, justifyContent: 'flex-end' }}>
      <Animated.View style={{ height, transform: [{ scaleY: s }], borderRadius: 3, overflow: 'hidden' }}>
        <LinearGradient colors={[colors.auroraBright, colors.primaryDeep]} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  dialValue: { fontSize: 40, fontWeight: fontWeight.heavy, letterSpacing: -1 },
  dialLabel: { color: colors.textFaint, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

  chart: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  baseline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  barsRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  barSlot: { flex: 1, height: '100%', alignItems: 'center' },
  chartUnit: { position: 'absolute', top: 6, right: 10, color: colors.textFaint, fontSize: fontSize.xs },

  miniRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 28 },
});

export default {};
