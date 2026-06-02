/**
 * Design tokens extracted from Figma file (UTwDtr261uT6tPxo0Hjxdi)
 *
 * Figma screens use a 412px-wide canvas (iPhone-sized) with:
 * - Gradient background: #e0e0e0 → white
 * - Source Han Sans SC font family
 * - Dark/grayscale color palette
 */

export const Colors = {
  /** Page background gradient start */
  backgroundStart: '#e0e0e0',
  /** Page background gradient end */
  backgroundEnd: '#ffffff',
  /** Card and input surfaces */
  surface: '#ffffff',
  /** Primary text - titles, headings */
  textPrimary: '#262626',
  /** Secondary text - descriptions, metadata */
  textSecondary: '#4d4d4d',
  /** Tertiary/disabled text, placeholders */
  textTertiary: '#b2b2b2',
  /** White text on dark backgrounds */
  textOnDark: '#ffffff',
  /** Text on surface (status bar) */
  textOnSurface: '#1d1b20',
  /** Active tab/button background */
  active: '#262626',
  /** Inactive tab/button background */
  inactive: '#b2b2b2',
  /** Active pill background for tags */
  pillActive: '#4d4d4d',
  /** Inactive pill background for tags */
  pillInactive: '#b2b2b2',
  /** Navigation handle color */
  navHandle: '#1d1b20',
  /** Destructive/delete */
  danger: '#b91c1c',
  /** Danger background */
  dangerBg: '#fee2e2',
  /** Modal overlay */
  overlay: 'rgba(38, 38, 38, 0.45)',
  /** Border / separator */
  border: '#e7e7e7',
} as const;

export const Typography = {
  titleLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  titleMedium: {
    fontSize: 24,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.textTertiary,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
} as const;

export const BorderRadius = {
  /** 4px – tag pills, small chips */
  sm: 4,
  /** 8px – cards, list items */
  md: 8,
  /** 12px – inputs, message bubbles */
  lg: 12,
  /** 16px – avatars, modal sheets */
  xl: 16,
  /** 100px – full-rounded pills, buttons */
  full: 100,
} as const;

export const Spacing = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px – standard horizontal padding */
  lg: 16,
  /** 24px */
  xl: 24,
  /** 66px – tab icon gap in bottom nav */
  tabGap: 66,
} as const;

export const Sizing = {
  /** Status bar height */
  statusBar: 52,
  /** Bottom navigation handle area */
  navHandleHeight: 24,
  /** Tab icon size */
  tabIcon: 32,
  /** Tab bar active pill width */
  tabPillWidth: 102,
  /** Tab bar active pill height */
  tabPillHeight: 41,
  /** Search component width */
  searchWidth: 37,
  /** Search component height */
  searchHeight: 24,
  /** Back button size */
  backButton: 24,
  /** AI assistant avatar size */
  aiAvatar: 96,
  /** Chat input bar height */
  chatInputHeight: 64,
  /** Card min height */
  cardMinHeight: 110,
  /** Card width (412 - 2*16) */
  cardWidth: 380,
} as const;