import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentWeek } from "@/lib/week";
import { deleteEntry } from "./actions";
import LogForm, { type ActivityType } from "./log-form";
import { formatRelativeDay } from "@/lib/format";
import { photoUrl } from "@/lib/photo";
import PhotoThumb from "@/components/PhotoThumb";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log activity" };
export const dynamic = "force-dynamic";

type MyEntry = {
  id: string;
  activity_date: string;
  note: string | null;
  photo_path: string | null;
  activity_types: { id: number; name: string; emoji: string | null } | null;
};

export default async function LogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [activityTypesRes, configRes] = await Promise.all([
    supabase
      .from("activity_types")
      .select("id, name, emoji, sort_order")
      .order("sort_order"),
    supabase
      .from("challenge_config")
      .select("timezone")
      .eq("id", 1)
      .single(),
  ]);

  const tz = configRes.data?.timezone ?? "Europe/Berlin";
  const { today, weekStart, days } = currentWeek(tz);

  const myEntriesRes = await supabase
    .from("entries")
    .select(
      "id, activity_date, note, photo_path, activity_types(id, name, emoji)",
    )
    .eq("user_id", user.id)
    .gte("activity_date", weekStart)
    .lte("activity_date", days[6].iso)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  const errors = [
    activityTypesRes.error,
    configRes.error,
    myEntriesRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load the log page</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e) => e?.message).join("\n")}
        </pre>
      </main>
    );
  }

  const activityTypes = (activityTypesRes.data ?? []) as ActivityType[];
  const myEntries = (myEntriesRes.data ?? []) as unknown as MyEntry[];

  const todayLocal = new Date(today + "T12:00:00");

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Log activity</h1>
        <span aria-hidden className="w-10" />
      </header>

      <LogForm activityTypes={activityTypes} days={days} todayIso={today} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          This week’s entries
        </h2>
        {myEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
            Nothing logged this week yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {myEntries.map((e) => {
              const url = photoUrl(e.photo_path);
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-3 p-3"
                >
                  <span className="mt-0.5 text-2xl leading-none">
                    {e.activity_types?.emoji ?? "•"}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">
                      {e.activity_types?.name ?? "Unknown"}
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
                      alt={e.activity_types?.name ?? "Activity"}
                      size={56}
                    />
                  ) : null}
                  <form action={deleteEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      aria-label="Delete entry"
                      className="rounded-full px-2.5 py-1 text-sm text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      ×
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
