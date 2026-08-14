/**
 * Design token palette — dark premium theme inspired by the web app.
 * All color usage should reference these tokens, never hardcoded hex strings.
 */
export const COLORS = {
  // ── Background hierarchy ──────────────────────────────────────────────────
  BG_DEEP: '#0A0C14',        // Deepest background (screen level)
  BG_SURFACE: '#111827',     // Card / surface background
  BG_ELEVATED: '#1C2333',    // Elevated card (modals, sheets)
  BG_BORDER: '#2D3748',      // Subtle dividers and borders

  // ── Primary accent ────────────────────────────────────────────────────────
  PRIMARY: '#6C63FF',        // Violet — primary CTA
  PRIMARY_LIGHT: '#8B84FF',  // Lighter shade
  PRIMARY_DARK: '#4F46E5',   // Darker shade
  PRIMARY_GLOW: 'rgba(108, 99, 255, 0.18)', // For glow effects

  // ── Secondary accent ──────────────────────────────────────────────────────
  SECONDARY: '#00D4AA',      // Teal — secondary / success / streak
  SECONDARY_LIGHT: '#4EECD2',
  SECONDARY_DARK: '#00A882',

  // ── Semantic colors ───────────────────────────────────────────────────────
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
  INFO: '#3B82F6',

  // ── Text hierarchy ────────────────────────────────────────────────────────
  TEXT_PRIMARY: '#F9FAFB',   // Main text
  TEXT_SECONDARY: '#9CA3AF', // Secondary labels
  TEXT_MUTED: '#6B7280',     // Placeholders, hints
  TEXT_INVERSE: '#0A0C14',   // Text on light surfaces

  // ── Difficulty levels (subjects) ──────────────────────────────────────────
  DIFFICULTY_1: '#10B981', // Easy
  DIFFICULTY_2: '#34D399',
  DIFFICULTY_3: '#F59E0B', // Medium
  DIFFICULTY_4: '#F97316',
  DIFFICULTY_5: '#EF4444', // Hard

  // ── Tab bar ───────────────────────────────────────────────────────────────
  TAB_ACTIVE: '#6C63FF',
  TAB_INACTIVE: '#6B7280',
  TAB_BG: '#111827',

  // ── Transparent overlays ─────────────────────────────────────────────────
  OVERLAY_LIGHT: 'rgba(255,255,255,0.06)',
  OVERLAY_DARK: 'rgba(0,0,0,0.4)',
} as const;

export type ColorKey = keyof typeof COLORS;
