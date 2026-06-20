/**
 * Stable colors per activity type id. Used by the breakdown pie
 * chart and the legend. Designed to be distinguishable in both
 * light and (eventual) dark mode.
 */
export const ACTIVITY_COLOR: Record<number, string> = {
  1: "#f97316", // Running  — orange
  2: "#3b82f6", // Gym      — blue
  3: "#14b8a6", // Biking   — teal
  4: "#ef4444", // Climbing — red
  5: "#a855f7", // Yoga     — purple
  6: "#06b6d4", // Swimming — cyan
  7: "#22c55e", // Hiking   — green
  8: "#6366f1", // Skiing   — indigo
  9: "#64748b", // Other    — slate
};

/** Fallback for any new activity type that wasn't in the map yet. */
export const DEFAULT_ACTIVITY_COLOR = "#94a3b8"; // slate-400
