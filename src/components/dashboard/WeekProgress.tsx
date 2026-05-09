import { formatWeekRange } from "@/lib/format";

export type ProgressRow = {
  user_id: string;
  display_name: string;
  is_admin: boolean;
  min_per_week: number;
  session_count: number;
  threshold_met: boolean;
  week_start: string; // YYYY-MM-DD
};

type Props = {
  rows: ProgressRow[];
  currentUserId: string;
};

export default function WeekProgress({ rows, currentUserId }: Props) {
  const weekStart = rows[0]?.week_start;
  const minPerWeek = rows[0]?.min_per_week ?? 3;

  // Sort: current user first, then by progress descending, then alpha.
  const sorted = [...rows].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    if (b.session_count !== a.session_count) {
      return b.session_count - a.session_count;
    }
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          This week
        </h2>
        {weekStart ? (
          <span className="text-xs text-neutral-400">
            {formatWeekRange(weekStart)}
          </span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {sorted.map((r) => (
          <ProgressItem
            key={r.user_id}
            row={r}
            minPerWeek={minPerWeek}
            isYou={r.user_id === currentUserId}
          />
        ))}
      </ul>
    </section>
  );
}

function ProgressItem({
  row,
  minPerWeek,
  isYou,
}: {
  row: ProgressRow;
  minPerWeek: number;
  isYou: boolean;
}) {
  const cap = Math.max(minPerWeek, row.session_count);
  const pct = Math.min(100, (row.session_count / minPerWeek) * 100);

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {row.display_name}
          {isYou ? <span className="ml-1 text-neutral-400">(you)</span> : null}
        </span>
        <span
          className={`text-sm font-semibold ${
            row.threshold_met ? "text-bucket-700" : "text-neutral-700"
          }`}
        >
          {row.session_count}/{minPerWeek}
          {row.threshold_met ? " ✓" : ""}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${
            row.threshold_met ? "bg-bucket-500" : "bg-neutral-400"
          }`}
          style={{ width: `${pct}%` }}
          aria-label={`${row.session_count} of ${cap} sessions`}
        />
      </div>
    </li>
  );
}
