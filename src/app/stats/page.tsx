import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchSeason } from "@/lib/season";
import {
  archivedTxns,
  fetchArchivedSeasons,
  type ArchivedSeason,
} from "@/lib/season-archive";
import Leaderboard, {
  type LeaderboardRow,
} from "@/components/stats/Leaderboard";
import Breakdown, {
  type CategoryRow,
  type PastEntry,
  type BucketTxn,
} from "@/components/stats/Breakdown";
import UserPicker from "@/components/stats/UserPicker";
import SeasonPicker from "@/components/stats/SeasonPicker";
import type { ChallengeRow } from "@/components/dashboard/Challenges";

export const metadata: Metadata = { title: "Statistics" };
export const dynamic = "force-dynamic";

type SearchParams = { tab?: string; user?: string; season?: string };

/**
 * The season the page is showing: the running one (default) or a finished
 * one from `season_archive`. Everything below counts inside [start, end].
 */
type ViewSeason = {
  name: string;
  start_date: string;
  end_date: string;
  currency: string;
  archived: ArchivedSeason | null;
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab === "breakdown" ? "breakdown" : "leaderboard";

  // Always need: list of profiles + currency.
  const [profilesRes, configRes, archiveRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, is_admin")
      .order("display_name"),
    fetchSeason(supabase),
    fetchArchivedSeasons(supabase),
  ]);

  if (profilesRes.error || configRes.error || !configRes.data) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load stats</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {[profilesRes.error?.message, configRes.error?.message]
            .filter(Boolean)
            .join("\n")}
        </pre>
      </main>
    );
  }

  const profiles = profilesRes.data ?? [];
  const current = configRes.data;
  // If the archive table isn't there yet, just offer the current season.
  const archived = archiveRes.error ? [] : (archiveRes.data ?? []);

  const picked = archived.find((a) => String(a.id) === searchParams.season);
  const season: ViewSeason = picked
    ? {
        name: picked.name,
        start_date: picked.start_date,
        end_date: picked.end_date,
        currency: picked.currency,
        archived: picked,
      }
    : {
        name: current.season_name,
        start_date: current.start_date,
        end_date: current.end_date,
        currency: current.currency,
        archived: null,
      };
  const currency = season.currency ?? "EUR";
  const seasonParam = picked ? String(picked.id) : undefined;
  const seasonQuery = seasonParam ? `&season=${seasonParam}` : "";

  const seasonOptions = [
    { value: "current", label: `${current.season_name} (current)` },
    ...archived.map((a) => ({
      value: String(a.id),
      label: `${a.name} · ${a.start_date.slice(0, 7)} – ${a.end_date.slice(0, 7)}`,
    })),
  ];
  const selectedUserId = searchParams.user ?? user.id;

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Statistics</h1>
        <span aria-hidden className="w-10" />
      </header>

      <nav className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
        <TabLink
          href={`/stats?tab=leaderboard${seasonQuery}`}
          active={tab === "leaderboard"}
          label="Leaderboard"
        />
        <TabLink
          href={`/stats?tab=breakdown&user=${user.id}${seasonQuery}`}
          active={tab === "breakdown"}
          label="Breakdown"
        />
      </nav>

      {seasonOptions.length > 1 ? (
        <SeasonPicker
          options={seasonOptions}
          value={seasonParam ?? "current"}
          tab={tab}
          user={tab === "breakdown" ? selectedUserId : undefined}
        />
      ) : null}

      {tab === "leaderboard" ? (
        <LeaderboardTab
          currentUserId={user.id}
          currency={currency}
          season={season}
        />
      ) : (
        <BreakdownTab
          profiles={profiles}
          selectedUserId={selectedUserId}
          currentUserId={user.id}
          currency={currency}
          season={season}
          seasonParam={seasonParam}
        />
      )}
    </main>
  );
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {label}
    </Link>
  );
}

async function LeaderboardTab({
  currentUserId,
  currency,
  season,
}: {
  currentUserId: string;
  currency: string;
  season: ViewSeason;
}) {
  // Finished season: read the frozen snapshot.
  if (season.archived) {
    const rows: LeaderboardRow[] = season.archived.results.users.map((u) => ({
      user_id: u.user_id,
      display_name: u.display_name,
      total_sessions: u.total_sessions,
      total_owed_cents: u.total_owed_cents,
    }));
    return (
      <Leaderboard
        rows={rows}
        currency={currency}
        currentUserId={currentUserId}
        owedLabel="paid"
      />
    );
  }

  const supabase = createClient();
  const [totalsRes, bucketRes] = await Promise.all([
    supabase
      .from("v_user_totals")
      .select("user_id, display_name, total_sessions"),
    supabase
      .from("v_bucket_summary")
      .select("user_id, total_owed_cents"),
  ]);

  if (totalsRes.error || bucketRes.error) {
    return (
      <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
        {[totalsRes.error?.message, bucketRes.error?.message]
          .filter(Boolean)
          .join("\n")}
      </pre>
    );
  }

  const owedByUser = new Map<string, number>(
    (bucketRes.data ?? []).map((r: { user_id: string; total_owed_cents: number }) => [
      r.user_id,
      r.total_owed_cents,
    ]),
  );

  const rows: LeaderboardRow[] = (totalsRes.data ?? []).map(
    (r: { user_id: string; display_name: string; total_sessions: number }) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      total_sessions: r.total_sessions,
      total_owed_cents: owedByUser.get(r.user_id) ?? 0,
    }),
  );

  return (
    <Leaderboard
      rows={rows}
      currency={currency}
      currentUserId={currentUserId}
    />
  );
}

async function BreakdownTab({
  profiles,
  selectedUserId,
  currentUserId,
  currency,
  season,
  seasonParam,
}: {
  profiles: { id: string; display_name: string; is_admin: boolean }[];
  selectedUserId: string;
  currentUserId: string;
  currency: string;
  season: ViewSeason;
  seasonParam?: string;
}) {
  const supabase = createClient();
  const range = { from: season.start_date, to: season.end_date };
  const archived = season.archived;

  // Make sure the selected user is real; otherwise fall back to current user.
  const subjectProfile =
    profiles.find((p) => p.id === selectedUserId) ??
    profiles.find((p) => p.id === currentUserId)!;
  const subjectId = subjectProfile.id;

  // Live views only describe the running season; a finished one is rebuilt
  // from its archive snapshot (see below).
  const [liveRes, entriesRes, categoryRes] = await Promise.all([
    archived
      ? Promise.resolve(null)
      : Promise.all([
          supabase
            .from("v_user_totals")
            .select("total_sessions")
            .eq("user_id", subjectId)
            .single(),
          supabase
            .from("v_bucket_summary")
            .select("total_owed_cents")
            .eq("user_id", subjectId)
            .single(),
          supabase
            .from("v_bucket_transactions")
            .select("occurred_at, kind, label, amount_cents")
            .eq("user_id", subjectId)
            .order("occurred_at", { ascending: false }),
          supabase
            .from("v_challenges")
            .select("*")
            .eq("status", "active")
            .or(`challenger_id.eq.${subjectId},target_id.eq.${subjectId}`),
        ]),
      // Recent-entries list: season only, capped for display.
      supabase
        .from("entries")
        .select(
          "id, activity_date, note, photo_path, activity_types(id, name, emoji)",
        )
        .eq("user_id", subjectId)
        .gte("activity_date", range.from)
        .lte("activity_date", range.to)
        .order("activity_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
      // Pie chart: EVERY session of the season (no display cap), so the
      // donut total always equals the leaderboard's total_sessions.
      supabase
        .from("entries")
        .select("activity_types(id, name, emoji)")
        .eq("user_id", subjectId)
        .gte("activity_date", range.from)
        .lte("activity_date", range.to),
  ]);

  const errors = [
    ...(liveRes ? liveRes.map((r) => r.error) : []),
    entriesRes.error,
    categoryRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return (
      <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
        {errors.map((e) => e?.message).join("\n")}
      </pre>
    );
  }

  type EntryShape = {
    id: string;
    activity_date: string;
    note: string | null;
    photo_path: string | null;
    activity_types: { id: number; name: string; emoji: string | null } | null;
  };
  const entries = (entriesRes.data ?? []) as unknown as EntryShape[];
  const seasonEntries = (categoryRes.data ?? []) as unknown as Pick<
    EntryShape,
    "activity_types"
  >[];

  // Aggregate by activity_type for the pie chart (whole season).
  const byCat = new Map<number, CategoryRow>();
  for (const e of seasonEntries) {
    if (!e.activity_types) continue;
    const id = e.activity_types.id;
    const existing = byCat.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      byCat.set(id, {
        activity_type_id: id,
        activity_name: e.activity_types.name,
        activity_emoji: e.activity_types.emoji,
        count: 1,
      });
    }
  }
  const categories = Array.from(byCat.values()).sort(
    (a, b) => b.count - a.count,
  );

  const pastEntries: PastEntry[] = entries.map((e) => ({
    id: e.id,
    activity_date: e.activity_date,
    activity_name: e.activity_types?.name ?? "Unknown",
    activity_emoji: e.activity_types?.emoji ?? null,
    note: e.note,
    photo_path: e.photo_path,
  }));

  // Numbers shown in the header + bucket section, for either kind of season.
  let totalSessions: number;
  let totalOwedCents: number;
  let bucketTxns: BucketTxn[];
  let activeChallenges: ChallengeRow[] = [];
  if (archived) {
    const au = archived.results.users.find((u) => u.user_id === subjectId);
    totalSessions = au?.total_sessions ?? 0;
    totalOwedCents = au?.total_owed_cents ?? 0;
    bucketTxns = au ? archivedTxns(archived, au) : [];
  } else {
    const [totalsRes, bucketSummaryRes, txnsRes, challengesRes] = liveRes!;
    totalSessions = totalsRes.data?.total_sessions ?? 0;
    totalOwedCents = bucketSummaryRes.data?.total_owed_cents ?? 0;
    bucketTxns = (txnsRes.data ?? []) as BucketTxn[];
    activeChallenges = (challengesRes.data ?? []) as ChallengeRow[];
  }

  return (
    <div className="flex flex-col gap-4">
      <UserPicker
        people={profiles.map((p) => ({
          id: p.id,
          display_name: p.display_name,
        }))}
        selectedId={subjectId}
        season={seasonParam}
      />
      <Breakdown
        subject={{
          id: subjectId,
          display_name: subjectProfile.display_name,
          total_sessions: totalSessions,
        }}
        isYou={subjectId === currentUserId}
        categories={categories}
        pastEntries={pastEntries}
        activeChallenges={activeChallenges}
        bucketTxns={bucketTxns}
        currency={currency}
        totalOwedCents={totalOwedCents}
        isArchived={Boolean(archived)}
      />
    </div>
  );
}
