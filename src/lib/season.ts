import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * THE single definition of "the current season".
 *
 * The source of truth is the one-row `challenge_config` table (id = 1):
 * season_name, start_date (Monday), end_date (Sunday), weekly target, fee.
 * To start a new season you change that row (see supabase/migrations/012) —
 * nothing in the app hardcodes dates.
 *
 * Rule for all code: anything that COUNTS sessions, weeks or money must be
 * limited to [start_date, end_date]. In SQL, join `challenge_config`; in app
 * code, read the season with `fetchSeason()` and apply `seasonRange()` to
 * entry queries. Never count raw `entries` without it.
 */
export type Season = {
  season_name: string;
  start_date: string; // YYYY-MM-DD, a Monday
  end_date: string; // YYYY-MM-DD, a Sunday
  min_per_week: number;
  fee_per_missed_week_cents: number;
  currency: string;
  timezone: string;
};

const SEASON_COLUMNS =
  "season_name, start_date, end_date, min_per_week, fee_per_missed_week_cents, currency, timezone";

/** Reads the current season. Same `{ data, error }` shape as `.single()`. */
export function fetchSeason(supabase: SupabaseClient) {
  return supabase
    .from("challenge_config")
    .select(SEASON_COLUMNS)
    .eq("id", 1)
    .single<Season>();
}

/** Inclusive date window of a season, for `.gte()` / `.lte()` on activity_date. */
export function seasonRange(season: Pick<Season, "start_date" | "end_date">) {
  return { from: season.start_date, to: season.end_date };
}

/** True if an ISO date (YYYY-MM-DD) falls inside the season (inclusive). */
export function isInSeason(
  season: Pick<Season, "start_date" | "end_date">,
  isoDate: string,
): boolean {
  return isoDate >= season.start_date && isoDate <= season.end_date;
}
