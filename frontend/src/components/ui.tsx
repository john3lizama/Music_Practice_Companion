import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, motion, radius, spacing, fontSize, fontWeight, shadow } from '../theme';

/* ----------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  iconLeft,
  style,
  testID,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  disabled?: boolean;
}) {
  const pad =
    size === 'lg'
      ? { paddingVertical: 16, paddingHorizontal: 28 }
      : size === 'sm'
      ? { paddingVertical: 8, paddingHorizontal: 14 }
      : { paddingVertical: 12, paddingHorizontal: 20 };
  const txtSize = size === 'lg' ? fontSize.lg : size === 'sm' ? fontSize.sm : fontSize.md;

  const inner = (
    <View style={[styles.btnRow, pad]}>
      {iconLeft}
      <Text
        style={[
          styles.btnText,
          { fontSize: txtSize },
          variant === 'primary' ? { color: colors.white } : { color: colors.text },
          iconLeft ? { marginLeft: 8 } : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => springTo(0.96)}
        onPressOut={() => springTo(1)}
        disabled={disabled}
        accessibilityRole="button"
        style={[
          styles.btnBase,
          variant === 'secondary' && styles.btnSecondary,
          variant === 'ghost' && styles.btnGhost,
          variant === 'primary' && shadow.glow,
          disabled && { opacity: 0.45 },
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={gradients.auroraAccent as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1.2, y: 1.2 }}
            style={styles.btnGradient}
          >
            {inner}
          </LinearGradient>
        ) : (
          inner
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------- GlassCard */

export function GlassCard({
  children,
  style,
  gradient = false,
  glow = false,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
  glow?: boolean;
  testID?: string;
}) {
  const edge = (
    <LinearGradient
      colors={gradients.glassEdge as unknown as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      style={styles.cardEdge}
    />
  );
  if (gradient) {
    return (
      <LinearGradient
        colors={gradients.card as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, glow && shadow.glow, style]}
      >
        {edge}
        <View testID={testID}>{children}</View>
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.card, styles.cardSolid, glow && shadow.glow, style]} testID={testID}>
      {edge}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------- Pill */

export function Pill({
  label,
  active,
  onPress,
  testID,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      {icon}
      <Text style={[styles.pillText, active && styles.pillTextActive, icon ? { marginLeft: 6 } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ----------------------------------------------------------- ProgressBar */

export function ProgressBar({
  value,
  height = 8,
  testID,
}: {
  value: number; // 0-100
  height?: number;
  testID?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height }]} testID={testID}>
      <LinearGradient
        colors={gradients.accent as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${clamped}%`, height: '100%', borderRadius: height }}
      />
    </View>
  );
}

/* ---------------------------------------------------------------- Seekbar */

/**
 * A draggable/clickable version of ProgressBar for scrubbing playback.
 * Uses React Native's core responder system (works on web via
 * react-native-web) rather than a platform-specific input, so the same
 * component drags on native and web alike.
 */
export function Seekbar({
  value,
  onSeek,
  onSeekEnd,
  height = 8,
  testID,
}: {
  value: number; // 0-100
  onSeek?: (percent: number) => void;
  onSeekEnd?: (percent: number) => void;
  height?: number;
  testID?: string;
}) {
  const widthRef = useRef(0);
  const clamped = Math.max(0, Math.min(100, value));

  const percentFromLocationX = (x: number) => {
    if (!widthRef.current) return null;
    return Math.max(0, Math.min(100, (x / widthRef.current) * 100));
  };

  const handleTouch = (e: any, end: boolean) => {
    const x = e.nativeEvent.locationX ?? e.nativeEvent.offsetX;
    const percent = percentFromLocationX(x);
    if (percent == null) return;
    (end ? onSeekEnd : onSeek)?.(percent);
  };

  // react-native-web passes plain DOM events like onClick through, but the
  // RN View type doesn't declare it — cast the extra web-only handler in via `any`.
  const webFallback: any = { onClick: (e: any) => handleTouch(e, true) };

  return (
    <View
      testID={testID}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e, false)}
      onResponderMove={(e) => handleTouch(e, false)}
      onResponderRelease={(e) => handleTouch(e, true)}
      {...webFallback}
      hitSlop={{ top: 14, bottom: 14 }}
      style={{ width: '100%', height: Math.max(height, 14), justifyContent: 'center' }}
    >
      <View style={[styles.progressTrack, { height, borderRadius: height }]}>
        <LinearGradient
          colors={gradients.accent as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${clamped}%`, height: '100%', borderRadius: height }}
        />
      </View>
      <View style={[styles.seekThumb, { left: `${clamped}%`, marginLeft: -7 }]} pointerEvents="none" />
    </View>
  );
}

/* ----------------------------------------------------------- SectionLabel */

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function H1({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<TextStyle>; testID?: string }) {
  return (
    <Text style={[styles.h1, style]} testID={testID}>
      {children}
    </Text>
  );
}

export function H2({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<TextStyle>; testID?: string }) {
  return (
    <Text style={[styles.h2, style]} testID={testID}>
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

/* --------------------------------------------------------------- Avatar */

export function Avatar({
  gradient,
  size = 44,
  label,
  testID,
}: {
  gradient: [string, string];
  size?: number;
  label?: string;
  testID?: string;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      testID={testID}
    >
      {label ? (
        <Text style={{ color: colors.white, fontWeight: fontWeight.bold, fontSize: size * 0.36 }}>{label}</Text>
      ) : null}
    </LinearGradient>
  );
}

/* ------------------------------------------------------------- BrandMark */

/**
 * MusicVJN wordmark — "MUSIC" in tracked caps + the VJN aurora chip,
 * skewed like a stage light with a cyan glow (design 4A-3).
 */
export function BrandMark({
  size = 'md',
  testID,
}: {
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
}) {
  const scale = size === 'lg' ? 1.5 : size === 'sm' ? 0.82 : 1;
  const musicSize = 20 * scale;
  const chipSize = 14 * scale;
  return (
    <View style={styles.brandRow} testID={testID} accessibilityRole="header" accessibilityLabel="MusicVJN">
      <Text
        style={[styles.brandMusic, { fontSize: musicSize, letterSpacing: 4 * scale }]}
      >
        MUSIC
      </Text>
      <View
        style={[
          styles.brandChipOuter,
          {
            shadowColor: colors.aurora,
            shadowOpacity: 0.55,
            shadowRadius: 14 * scale,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          },
        ]}
      >
        <LinearGradient
          colors={gradients.auroraAccent as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.1, y: 1.1 }}
          style={[
            styles.brandChip,
            {
              paddingVertical: 3 * scale,
              paddingHorizontal: 10 * scale,
              borderRadius: 7 * scale,
              transform: [{ skewX: '-8deg' }],
            },
          ]}
        >
          <Text
            style={[
              styles.brandChipText,
              { fontSize: chipSize, letterSpacing: 3 * scale, transform: [{ skewX: '8deg' }] },
            ]}
          >
            VJN
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------- Waveform */

function WaveBar({
  color,
  maxHeight,
  delay,
  width,
}: {
  color: string;
  maxHeight: number;
  delay: number;
  width: number;
}) {
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 380 + (delay % 240),
          delay,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0.25,
          duration: 420 + (delay % 180),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, delay]);

  return (
    <View style={{ height: maxHeight, width, justifyContent: 'center' }}>
      <Animated.View
        style={{
          width,
          height: maxHeight,
          borderRadius: width / 2,
          backgroundColor: color,
          transform: [{ scaleY: v }],
        }}
      />
    </View>
  );
}

/**
 * Living equalizer — staggered bars that pulse like a live signal.
 * The signature "the app is listening" motion element.
 */
export function Waveform({
  bars = 12,
  height = 32,
  barWidth = 4,
  gap = 3,
  animated = true,
  testID,
}: {
  bars?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  animated?: boolean;
  testID?: string;
}) {
  const palette = [colors.primary, colors.primaryBright, colors.aurora, colors.magenta];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }} testID={testID}>
      {Array.from({ length: bars }).map((_, i) =>
        animated ? (
          <WaveBar
            key={i}
            color={palette[i % palette.length]}
            maxHeight={height}
            width={barWidth}
            delay={(i * 97) % 700}
          />
        ) : (
          <View
            key={i}
            style={{
              width: barWidth,
              height: height * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7))),
              borderRadius: barWidth / 2,
              backgroundColor: palette[i % palette.length],
            }}
          />
        ),
      )}
    </View>
  );
}

/* --------------------------------------------------------------- CountUp */

/** Number that counts up from 0 when it mounts — scores feel earned. */
export function CountUp({
  value,
  duration = motion.slow,
  style,
  testID,
}: {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sub = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(sub);
  }, [anim, value, duration]);
  return (
    <Text style={style} testID={testID}>
      {display}
    </Text>
  );
}

/* ------------------------------------------------------------------ Stat */

export function Stat({ value, label, testID }: { value: string; label: string; testID?: string }) {
  return (
    <View style={styles.stat} testID={testID}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ----------------------------------------------------------------- styles */

const styles = StyleSheet.create({
  btnBase: { borderRadius: radius.pill, overflow: 'hidden' },
  btnGradient: { borderRadius: radius.pill },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: fontWeight.semibold, letterSpacing: 0.2 },
  btnSecondary: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnGhost: { backgroundColor: 'transparent' },

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardSolid: { backgroundColor: colors.surface },
  cardEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.6,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMusic: { color: colors.text, fontWeight: fontWeight.regular },
  brandChipOuter: {},
  brandChip: { alignItems: 'center', justifyContent: 'center' },
  brandChipText: { color: colors.white, fontWeight: fontWeight.semibold },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  pillText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  pillTextActive: { color: colors.primaryBright, fontWeight: fontWeight.semibold },

  progressTrack: { width: '100%', backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  seekThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryBright,
  },

  sectionLabel: {
    color: colors.primaryBright,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  h1: { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  h2: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  muted: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: 22 },

  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  statLabel: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
});

export default {};
