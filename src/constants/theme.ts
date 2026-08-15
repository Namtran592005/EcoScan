/**
 * Global visual theme for EcoScan.
 * Dark iOS (Apple) style palette — deep black, translucent surfaces,
 * system blue accent, frosted-glass layering suited to a camera UI.
 */
export const Colors = {
  // Default iOS dark palette — pure black base
  bg: '#000000',
  bgElevated: '#111315',
  surface: '#1C1C1E',
  surfaceHigh: '#2C2C2E',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.25)',
  separator: 'rgba(255,255,255,0.08)',

  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTernary: '#98989D',
  textMuted: '#8E8E93',
  textQuaternary: '#48484A',

  // iOS system tint
  accent: '#0A84FF',
  accentDim: 'rgba(10,132,255,0.18)',

  success: '#32D74B',
  warning: '#FFD60A',
  danger: '#FF453A',
  info: '#64D2FF',

  // Frosted overlays used over the live camera
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',
  glass: 'rgba(28,28,30,0.72)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const Radii = {
  sm: 10,
  md: 14,
  lg: 22,
  xl: 32,
} as const;

/** Minimum tappable size (accessibility). */
export const TouchTarget = 48;

/** Apple uses tighter vertical rhythm; body 17 mirrors iOS default. */
export const Font = {
  title: 28,
  heading: 20,
  body: 17,
  small: 15,
  caption: 13,
} as const;