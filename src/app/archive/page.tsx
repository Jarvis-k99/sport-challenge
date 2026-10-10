import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Past seasons" };
export const dynamic = "force-dynamic";

type ArchivedUser = {
  user_id: string;
  display_name: string;
  total_sessions: number;
  missed_weeks: number;
  missed_fee_cents: number;
  lost_challenges_cents: number;
  total_owed_cents: number;
  weeks: { week_start: string; sessions: number }[];
};

type ArchivedChallenge = {
  description: string;
  amount_cents: number;
  challenger: string;
  target: string;
  loser: string;
  resolved_at: string | null;
};

type SeasonRow = {
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

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("season_archive")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load past seasons</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {error.message}
        </pre>
      </main>
    );
  }

  const seasons = (data ?? []) as SeasonRow[];
  const wanted = Number(searchParams.id);
  const season = seasons.find((s) => s.id === wanted) ?? seasons[0];

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Past seasons</h1>
        <span aria-hidden className="w-10" />
      </header>

      {!season ? (
        <p className="text-sm text-neutral-500">No archived seasons yet.</p>
      ) : (
        <SeasonView
          season={season}
          allSeasons={seasons}
          currentUserId={user.id}
        />
      )}
    </main>
  );
}

function SeasonView({
  season,
  allSeasons,
  currentUserId,
}: {
  season: SeasonRow;
  allSeasons: SeasonRow[];
  currentUserId: string;
}) {
  const { users, challenges, bucket_total_cents } = season.results;
  const cur = season.currency;

  const byRank = [...users].sort(
    (a, b) =>
      b.total_sessions - a.total_sessions ||
      a.total_owed_cents - b.total_owed_cents ||
      a.display_name.localeCompare(b.display_name),
  );
  const topSessions = byRank[0]?.total_sessions ?? 0;
  const winners = byRank.filter((u) => u.total_sessions === topSessions);
  const perfect = users.filter((u) => u.missed_weeks === 0);
  const maxOwed = Math.max(0, ...users.map((u) => u.total_owed_cents));
  const biggestPayers = maxOwed
    ? users.filter((u) => u.total_owed_cents === maxOwed)
    : [];

  return (
    <>
      {allSeasons.length > 1 ? (
        <nav className="flex gap-2">
          {allSeasons.map((s) => (
            <Link
              key={s.id}
              href={`/archive?id=${s.id}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                s.id === season.id
                  ? "border-bucket-500 bg-bucket-50 text-bucket-700"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">{season.name}</h2>
        <p className="text-sm text-neutral-500">
          {formatShortDate(season.start_date)} –{" "}
          {formatShortDate(season.end_date)} · ≥{season.min_per_week}{" "}
          sessions/week ·{" "}
          {formatCents(season.fee_per_missed_week_cents, cur)} per missed week
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Highlight
          icon="🏆"
          label="Most sessions"
          value={winners.map((w) => w.display_name).join(" & ") || "—"}
          detail={`${topSessions} sessions`}
        />
        <Highlight
          icon="✅"
          label="Never missed a week"
          value={perfect.map((p) => p.display_name).join(", ") || "Nobody"}
          detail={perfect.length ? "perfect record" : "—"}
        />
        <Highlight
          icon="💸"
          label="Paid the most"
          value={biggestPayers.map((p) => p.display_name).join(" & ") || "—"}
          detail={maxOwed ? formatCents(maxOwed, cur) : "—"}
        />
        <Highlight
          icon="🪣"
          label="Final bucket"
          value={formatCents(bucket_total_cents, cur)}
          detail="to settle in person"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Final standings
        </h3>
        <ol className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {byRank.map((u, i) => (
            <li
              key={u.user_id}
              className={`flex flex-col gap-1 p-3 ${
                u.user_id === currentUserId ? "bg-bucket-50/50" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-3">
                  <span className="w-6 text-sm font-bold text-neutral-400">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold">
                    {u.display_name}
                  </span>
                </span>
                <span className="text-sm">
                  <strong>{u.total_sessions}</strong>{" "}
                  <span className="text-xs text-neutral-500">sessions</span>
                </span>
              </div>
              <div className="flex justify-between pl-9 text-xs text-neutral-500">
                <span>
                  {u.missed_weeks} missed{" "}
                  {u.missed_weeks === 1 ? "week" : "weeks"} (
                  {formatCents(u.missed_fee_cents, cur)})
                  {u.lost_challenges_cents > 0
                    ? ` · lost bets ${formatCents(u.lost_challenges_cents, cur)}`
                    : ""}
                </span>
                <span className="font-medium text-neutral-700">
                  paid {formatCents(u.total_owed_cents, cur)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {challenges.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Resolved challenges
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {challenges.map((c, i) => (
              <li key={i} className="flex flex-col gap-0.5 p-3 text-sm">
                <span className="font-medium">{c.description}</span>
                <span className="text-xs text-neutral-500">
                  {c.challenger} → {c.target} · {c.loser} lost{" "}
                  {formatCents(c.amount_cents, cur)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Highlight({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <span className="text-xs text-neutral-500">
        {icon} {label}
      </span>
      <span className="text-sm font-semibold leading-snug">{value}</span>
      <span className="text-xs text-neutral-400">{detail}</span>
    </div>
  );
}
