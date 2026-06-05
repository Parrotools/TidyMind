/**
 * Material Design 3 — Design Tokens
 *
 * Purple/Violet seed (#6750A4), tonal surface system, organic radii.
 */

// ── MD3 色彩系统 ──────────────────────────────────────────────────

export const Colors = {
  // 基础色
  primary: '#6750A4',
  primaryContainer: '#E8DEF8',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1D192B',

  // 表面系统
  background: '#FFFBFE',
  surface: '#FFFBFE',
  surfaceContainer: '#F3EDF7',
  surfaceContainerLow: '#E7E0EC',

  // 次要色
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',

  // 文字
  textPrimary: '#1C1B1F',
  textSecondary: '#49454F',
  textTertiary: '#938F99',
  textOnDark: '#FFFFFF',

  // 描边
  outline: '#79747E',
  border: '#CAC4D0',

  // 功能色
  active: '#6750A4',
  inactive: '#E7E0EC',
  danger: '#B3261E',
  dangerBg: '#F9DEDC',
  overlay: 'rgba(28, 27, 31, 0.40)',
} as const;

// ── 排版 ──────────────────────────────────────────────────────────

export const Typography = {
  displayLarge: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, color: Colors.textPrimary },
  headlineLarge: { fontSize: 28, fontWeight: '500' as const, lineHeight: 36, color: Colors.textPrimary },
  headlineMedium: { fontSize: 24, fontWeight: '500' as const, lineHeight: 32, color: Colors.textPrimary },
  titleLarge: { fontSize: 20, fontWeight: '500' as const, lineHeight: 28, color: Colors.textPrimary },
  titleMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24, color: Colors.textPrimary },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 26, color: Colors.textPrimary },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22, color: Colors.textSecondary },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, color: Colors.textSecondary },
  labelMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, color: Colors.textPrimary },
  labelSmall: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, color: Colors.textSecondary },
} as const;

// ── 圆角 ──────────────────────────────────────────────────────────

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  xxl: 48,
  full: 9999,
} as const;

// ── 间距 ──────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── 阴影 ──────────────────────────────────────────────────────────

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1C1B1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
