import { formatRelativeDay } from "@/lib/format";

export type RecentEntry = {
  id: string;
  user_id: string;
  display_name: string;
  activity_name: string;
  activity_emoji: string | null;
  activity_date: string;
  created_at: string;
};

type Props = {
  entries: RecentEntry[];
  todayLocal: Date;
};

export default function RecentActivity({ entries, todayLocal }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Recent activity
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
          No entries yet — be the first to log a session.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">
                  {e.activity_emoji ?? "•"}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {e.display_name} · {e.activity_name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatRelativeDay(e.activity_date, todayLocal)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
