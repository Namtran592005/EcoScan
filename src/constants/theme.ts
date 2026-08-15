/**
 * Global visual theme for EcoScan.
 * Dark iOS (Apple) style palette — deep black, translucent surfaces,
 * system blue accent, frosted-glass layering suited to a camera UI.
 */
export const Colors = {
  // Deep green-black matching the app icon background (#04110a)
  bg: '#04110a',
  bgElevated: '#0a1d14',
  surface: '#122a1d',
  surfaceHigh: '#1d3a2b',
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
  overlay: 'rgba(4,17,10,0.5)',
  overlayLight: 'rgba(4,17,10,0.3)',
  glass: 'rgba(18,42,29,0.72)',
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