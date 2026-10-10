import type { SupabaseClient } from "@supabase/supabase-js";
import { formatShortDate } from "@/lib/format";

/**
 * Frozen results of finished seasons (table `season_archive`, written once by
 * the season-rollover migration). Use these for "what happened in season X";
 * use `lib/season.ts` for the season that is running now.
 */
export type ArchivedUser = {
  user_id: string;
  display_name: string;
  total_sessions: number;
  missed_weeks: number;
  missed_fee_cents: number;
  lost_challenges_cents: number;
  total_owed_cents: number;
  /** One row per season week (from the user's join week on). */
  weeks: { week_start: string; sessions: number }[];
};

export type ArchivedChallenge = {
  description: string;
  amount_cents: number;
  challenger: string;
  target: string;
  loser: string;
  resolved_at: string | null;
};

export type ArchivedSeason = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  min_per_week: number;
  fee_per_missed_week_cents: number;
  currency: string;
  results: {
    users: ArchivedUser[];
    challenges: ArchivedChallenge[];
    bucket_total_cents: number;
  };
};

/** All archived seasons, newest first. */
export function fetchArchivedSeasons(supabase: SupabaseClient) {
  return supabase
    .from("season_archive")
    .select("*")
    .order("id", { ascending: false })
    .returns<ArchivedSeason[]>();
}

export type ArchivedTxn = {
  occurred_at: string;
  kind: "missed_week" | "lost_challenge";
  label: string;
  amount_cents: number;
};

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Rebuilds a player's bucket transactions for a finished season from the
 * snapshot — same rows the live `v_bucket_transactions` view shows for a
 * running season (missed weeks + lost challenges), newest first.
 */
export function archivedTxns(
  season: ArchivedSeason,
  user: ArchivedUser,
): ArchivedTxn[] {
  const missed: ArchivedTxn[] = user.weeks
    .filter((w) => w.sessions < season.min_per_week)
    .map((w) => ({
      occurred_at: addDaysIso(w.week_start, 6),
      kind: "missed_week" as const,
      label: `Missed week of ${formatShortDate(w.week_start)}`,
      amount_cents: season.fee_per_missed_week_cents,
    }));

  const lost: ArchivedTxn[] = season.results.challenges
    .filter((c) => c.loser === user.display_name)
    .map((c) => ({
      occurred_at: c.resolved_at ?? season.end_date,
      kind: "lost_challenge" as const,
      label: `Lost: ${c.description}`,
      amount_cents: c.amount_cents,
    }));

  return [...missed, ...lost].sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at),
  );
}
