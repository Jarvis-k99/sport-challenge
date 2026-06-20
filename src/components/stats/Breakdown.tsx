import { formatCents, formatShortDate } from "@/lib/format";
import { photoUrl } from "@/lib/photo";
import { ACTIVITY_COLOR, DEFAULT_ACTIVITY_COLOR } from "@/lib/activity-colors";
import PhotoThumb from "@/components/PhotoThumb";
import PieChart, { type PieSlice } from "./PieChart";
import type { ChallengeRow } from "@/components/dashboard/Challenges";

export type CategoryRow = {
  activity_type_id: number;
  activity_name: string;
  activity_emoji: string | null;
  count: number;
};

export type PastEntry = {
  id: string;
  activity_date: string;
  activity_name: string;
  activity_emoji: string | null;
  note: string | null;
  photo_path: string | null;
};

export type BucketTxn = {
  occurred_at: string;
  kind: "missed_week" | "lost_challenge";
  label: string;
  amount_cents: number;
};

type Props = {
  subject: { id: string; display_name: string; total_sessions: number };
  isYou: boolean;
  categories: CategoryRow[];
  pastEntries: PastEntry[];
  activeChallenges: ChallengeRow[];
  bucketTxns: BucketTxn[];
  currency: string;
  totalOwedCents: number;
};

export default function Breakdown({
  subject,
  isYou,
  categories,
  pastEntries,
  activeChallenges,
  bucketTxns,
  currency,
  totalOwedCents,
}: Props) {
  const slices: PieSlice[] = categories.map((c) => ({
    key: c.activity_type_id,
    label: c.activity_name,
    emoji: c.activity_emoji,
    value: c.count,
    color: ACTIVITY_COLOR[c.activity_type_id] ?? DEFAULT_ACTIVITY_COLOR,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            {subject.display_name}
            {isYou ? (
              <span className="ml-1 text-sm font-normal text-neutral-400">
                (you)
              </span>
            ) : null}
          </h2>
          <span className="text-sm text-neutral-500">
            {subject.total_sessions} sessions ·{" "}
            <span
              className={
                totalOwedCents > 0 ? "text-neutral-900" : "text-neutral-400"
              }
            >
              owes {formatCents(totalOwedCents, currency)}
            </span>
          </span>
        </div>
      </header>

      <Section title="By category">
        <PieChart slices={slices} size={220} />
      </Section>

      <Section title={`Active challenges (${activeChallenges.length})`}>
        {activeChallenges.length === 0 ? (
          <EmptyHint>No active challenges right now.</EmptyHint>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-purple-200 bg-white shadow-sm">
            {activeChallenges.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">
                    {c.challenger_name}
                    <span className="text-neutral-400"> vs </span>
                    {c.target_name}
                  </span>
                  <span className="text-sm font-bold text-purple-700">
                    {formatCents(c.amount_cents, currency)}
                  </span>
                </div>
                <p className="text-sm text-neutral-700">{c.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Bucket transactions (${bucketTxns.length})`}
        right={
          <span className="text-sm font-semibold text-neutral-900">
            {formatCents(totalOwedCents, currency)}
          </span>
        }
      >
        {bucketTxns.length === 0 ? (
          <EmptyHint>Nothing in the bucket yet — keep it up.</EmptyHint>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {bucketTxns.map((t, i) => (
              <li
                key={`${t.occurred_at}-${i}`}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-neutral-800">
                    {t.label}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatShortDate(t.occurred_at)} ·{" "}
                    {t.kind === "missed_week" ? "missed week" : "lost challenge"}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {formatCents(t.amount_cents, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Past activities (${pastEntries.length})`}>
        {pastEntries.length === 0 ? (
          <EmptyHint>No sessions logged yet.</EmptyHint>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {pastEntries.map((e) => {
              const url = photoUrl(e.photo_path);
              return (
                <li key={e.id} className="flex items-start gap-3 p-3">
                  <span className="mt-0.5 text-2xl leading-none">
                    {e.activity_emoji ?? "•"}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">
                      {e.activity_name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatShortDate(e.activity_date)}
                    </span>
                    {e.note ? (
                      <p className="mt-1 line-clamp-3 text-sm text-neutral-700">
                        {e.note}
                      </p>
                    ) : null}
                  </div>
                  {url ? (
                    <PhotoThumb
                      url={url}
                      alt={e.activity_name}
                      size={48}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </h3>
        {right ?? null}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
      {children}
    </p>
  );
}
