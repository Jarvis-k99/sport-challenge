import { formatCents } from "@/lib/format";

export type BucketRow = {
  user_id: string;
  display_name: string;
  missed_weeks: number;
  missed_fee_cents: number;
  lost_challenges_cents: number;
  total_owed_cents: number;
};

type Props = {
  rows: BucketRow[];
  currency: string;
  currentUserId: string;
};

export default function BucketSummary({ rows, currency, currentUserId }: Props) {
  const total = rows.reduce((sum, r) => sum + r.total_owed_cents, 0);

  // Sort: current user first, then by amount owed descending, then alpha.
  const sorted = [...rows].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    if (b.total_owed_cents !== a.total_owed_cents) {
      return b.total_owed_cents - a.total_owed_cents;
    }
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Bucket
        </h2>
        <span className="text-2xl font-bold tracking-tight text-bucket-700">
          {formatCents(total, currency)}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {sorted.map((r) => (
          <li key={r.user_id} className="flex items-center justify-between p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {r.display_name}
                {r.user_id === currentUserId ? (
                  <span className="ml-1 text-neutral-400">(you)</span>
                ) : null}
              </span>
              <span className="text-xs text-neutral-500">
                {r.missed_weeks > 0
                  ? `${r.missed_weeks} missed week${r.missed_weeks === 1 ? "" : "s"}`
                  : "no missed weeks"}
                {r.lost_challenges_cents > 0
                  ? ` · ${formatCents(r.lost_challenges_cents, currency)} from challenges`
                  : ""}
              </span>
            </div>
            <span
              className={`text-sm font-semibold ${
                r.total_owed_cents > 0 ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              {formatCents(r.total_owed_cents, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
