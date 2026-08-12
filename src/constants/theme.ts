/**
 * Global visual theme for EcoScan.
 * Dark, high-contrast palette suited for a camera-centred UI.
 */
export const Colors = {
  bg: '#0B1220',
  bgElevated: '#111A2C',
  surface: '#182336',
  border: 'rgba(255,255,255,0.14)',
  borderStrong: 'rgba(255,255,255,0.28)',

  text: '#F4F7FB',
  textSecondary: '#B9C3D4',
  textMuted: '#7E8A9D',

  accent: '#22D3EE',
  accentDim: 'rgba(34,211,238,0.18)',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',

  overlay: 'rgba(6,10,18,0.55)',
  overlayLight: 'rgba(6,10,18,0.35)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
} as const;

/** Minimum tappable size (accessibility). */
export const TouchTarget = 48;

export const Font = {
  title: 22,
  heading: 18,
  body: 15,
  small: 13,
  caption: 11,
} as const;