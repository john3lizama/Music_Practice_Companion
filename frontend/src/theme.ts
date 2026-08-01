/**
 * Premium dark + purple design system.
 * Centralized tokens so the whole app shares one consistent, Apple-grade look.
 */

export const colors = {
  // Base surfaces (near-black with a violet undertone)
  bg: '#08060D',
  bgElevated: '#0E0A18',
  surface: 'rgba(255,255,255,0.04)',
  surfaceStrong: 'rgba(255,255,255,0.07)',
  surfaceHover: 'rgba(168,139,250,0.10)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(168,139,250,0.30)',

  // Purple accent ramp
  primary: '#8B5CF6',
  primaryBright: '#A78BFA',
  primaryDeep: '#6D28D9',
  primarySoft: 'rgba(139,92,246,0.16)',
  glow: 'rgba(124,58,237,0.55)',

  // Aurora stage accents (cyan + magenta stage lights)
  aurora: '#22D3EE',
  auroraBright: '#67E8F9',
  auroraSoft: 'rgba(34,211,238,0.14)',
  magenta: '#E879F9',
  magentaSoft: 'rgba(232,121,249,0.14)',

  // Text
  text: '#F5F3FF',
  textMuted: '#A7A3B8',
  textFaint: '#6E6A80',

  // Status
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',

  white: '#FFFFFF',
  black: '#000000',
} as const;

// Gradients are expressed as color arrays for expo-linear-gradient.
export const gradients = {
  appBackground: ['#13091F', '#0A0712', '#08060D'] as const,
  hero: ['#2A1259', '#160B2E', '#08060D'] as const,
  accent: ['#7C3AED', '#A855F7', '#C084FC'] as const,
  accentSoft: ['rgba(124,58,237,0.35)', 'rgba(168,85,247,0.05)'] as const,
  card: ['rgba(168,139,250,0.10)', 'rgba(124,58,237,0.02)'] as const,
  ring: ['#A78BFA', '#7C3AED'] as const,
  // Aurora stage: violet → magenta → cyan sweeps
  aurora: ['#7C3AED', '#C026D3', '#0891B2'] as const,
  auroraAccent: ['#8B5CF6', '#D946EF', '#22D3EE'] as const,
  glassEdge: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.0)'] as const,
};

// Shared animation timings for the "rich motion" feel.
export const motion = {
  fast: 180,
  base: 320,
  slow: 700,
  breathe: 5200, // aurora blob pulse period
  drift: 9000, // aurora blob drift period
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 72,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 40,
  hero: 56,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const shadow = {
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const theme = {
  colors,
  gradients,
  motion,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
};

export default theme;
