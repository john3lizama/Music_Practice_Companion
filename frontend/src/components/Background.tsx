import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, motion } from '../theme';

/**
 * "Aurora stage" backdrop — three stage-light blobs (violet, cyan, magenta)
 * that slowly drift and breathe like concert lighting. Wrap any screen in
 * this for the shared atmosphere. Same API as before: children/style/testID.
 */

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, duration, delay]);
  return v;
}

function AuroraBlob({
  color,
  size,
  position,
  baseOpacity,
  driftX,
  driftY,
  delay,
  blur,
}: {
  color: string;
  size: number;
  position: ViewStyle;
  baseOpacity: number;
  driftX: number;
  driftY: number;
  delay: number;
  blur: number;
}) {
  const t = useLoop(motion.drift, delay);
  const breathe = useLoop(motion.breathe, delay / 2);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          filter: `blur(${blur}px)`, // web-only soft stage-light glow
        } as any,
        position,
        {
          opacity: breathe.interpolate({
            inputRange: [0, 1],
            outputRange: [baseOpacity * 0.6, baseOpacity],
          }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, driftY] }) },
            { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        },
      ]}
    />
  );
}

export function Background({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <View style={[styles.root, style]} testID={testID}>
      <LinearGradient
        colors={gradients.appBackground as unknown as string[]}
        style={StyleSheet.absoluteFill}
      />
      <AuroraBlob
        color={colors.primaryDeep}
        size={460}
        position={{ top: -170, right: -130 }}
        baseOpacity={0.5}
        driftX={-50}
        driftY={36}
        delay={0}
        blur={120}
      />
      <AuroraBlob
        color="#0E7490"
        size={380}
        position={{ top: 140, left: -180 }}
        baseOpacity={0.34}
        driftX={60}
        driftY={-30}
        delay={1400}
        blur={130}
      />
      <AuroraBlob
        color="#A21CAF"
        size={420}
        position={{ bottom: -190, left: '30%' as unknown as number }}
        baseOpacity={0.3}
        driftX={-40}
        driftY={-44}
        delay={2600}
        blur={140}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  content: { flex: 1 },
});

export default Background;
