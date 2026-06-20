import { formatCents } from "@/lib/format";

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  total_sessions: number;
  total_owed_cents: number;
};

type Props = {
  rows: LeaderboardRow[];
  currency: string;
  currentUserId: string;
};

export default function Leaderboard({ rows, currency, currentUserId }: Props) {
  const sorted = [...rows].sort((a, b) => {
    if (b.total_sessions !== a.total_sessions) {
      return b.total_sessions - a.total_sessions;
    }
    // Tie-break: less owed wins (more weeks hit).
    if (a.total_owed_cents !== b.total_owed_cents) {
      return a.total_owed_cents - b.total_owed_cents;
    }
    return a.display_name.localeCompare(b.display_name);
  });

  const maxSessions = Math.max(1, ...sorted.map((r) => r.total_sessions));

  return (
    <ol className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {sorted.map((r, i) => {
        const isYou = r.user_id === currentUserId;
        const pct = (r.total_sessions / maxSessions) * 100;
        return (
          <li
            key={r.user_id}
            className={`flex flex-col gap-2 p-3 ${
              isYou ? "bg-bucket-50/50" : ""
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-3">
                <span className="w-6 text-sm font-bold text-neutral-400">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold">
                  {r.display_name}
                  {isYou ? (
                    <span className="ml-1 text-neutral-400">(you)</span>
                  ) : null}
                </span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-base font-bold text-neutral-900">
                  {r.total_sessions}
                </span>
                <span className="text-xs text-neutral-500">sessions</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-bucket-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium ${
                  r.total_owed_cents > 0
                    ? "text-neutral-700"
                    : "text-neutral-400"
                }`}
              >
                owes {formatCents(r.total_owed_cents, currency)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
