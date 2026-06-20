import { formatRelativeDay } from "@/lib/format";
import { photoUrl } from "@/lib/photo";
import PhotoThumb from "@/components/PhotoThumb";

export type RecentEntry = {
  id: string;
  user_id: string;
  display_name: string;
  activity_name: string;
  activity_emoji: string | null;
  activity_date: string;
  created_at: string;
  note: string | null;
  photo_path: string | null;
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
          {entries.map((e) => {
            const url = photoUrl(e.photo_path);
            return (
              <li key={e.id} className="flex items-start gap-3 p-3">
                <span className="mt-0.5 text-2xl leading-none">
                  {e.activity_emoji ?? "•"}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {e.display_name} · {e.activity_name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatRelativeDay(e.activity_date, todayLocal)}
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
                    alt={`${e.display_name} · ${e.activity_name}`}
                    size={56}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
