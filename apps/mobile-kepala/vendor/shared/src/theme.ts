// ============================================================================
// SIM MADIN — Islamic Theme Color Palette
// ============================================================================
// Derived from logo-madrasah.png color analysis:
//   - Primary green: #008040 (dome + shield background) → normalized #0D7A4F
//   - Gold: #f0f0c0 (stars + book) → normalized #D4A017
//   - Dark green: #006040 (book pages) → #0A5C38
//
// ALL apps share the SAME color scheme for consistency.
// Each app differentiated by name/subtitle, NOT by color.
// ============================================================================

export const ISLAMIC_THEME = {
  // Primary — Islamic Green (from logo dome & shield)
  primary:        "#0D7A4F",  // Main brand color (buttons, headers, active states)
  primaryDark:    "#0A5C38",  // Pressed/darker states
  primaryLight:   "#D1FAE5",  // Light backgrounds, badges
  primaryAlpha:   "rgba(13, 122, 79, 0.1)",  // Subtle backgrounds

  // Gold Accent — from logo stars & book
  gold:           "#D4A017",  // Accent, highlights, special badges
  goldLight:      "#FEF3C7",  // Gold badge backgrounds
  goldDark:       "#A07B12",  // Gold pressed states

  // Neutrals
  background:     "#F8FAFC",  // App background (slate-50)
  card:           "#FFFFFF",   // Card/surface background
  text:           "#1E293B",  // Primary text (slate-800)
  textMuted:      "#64748B",  // Secondary text (slate-500)
  textLight:      "#94A3B8",  // Tertiary text (slate-400)
  border:         "#E2E8F0",  // Borders (slate-200)
  white:          "#FFFFFF",

  // Semantic colors
  danger:         "#DC2626",  // Error, delete (red-600)
  dangerLight:    "#FEE2E2",  // Error background
  warning:        "#D97706",  // Warning (amber-600)
  warningLight:   "#FEF3C7",  // Warning background
  success:        "#059669",  // Success (emerald-600)
  successLight:   "#D1FAE5",  // Success background
  info:           "#2563EB",  // Info (blue-600)
  infoLight:      "#DBEAFE",  // Info background

  // Splash screen background
  splashBg:       "#0D7A4F",  // Same as primary
} as const

export type ThemeColor = typeof ISLAMIC_THEME[keyof typeof ISLAMIC_THEME]
