import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatShortDate } from "@/lib/format";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rules" };
export const dynamic = "force-dynamic";

function weeksBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24 * 7));
}

export default async function RulesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [configRes, activitiesRes, profilesRes] = await Promise.all([
    supabase
      .from("challenge_config")
      .select("*")
      .eq("id", 1)
      .single(),
    supabase
      .from("activity_types")
      .select("id, name, emoji, sort_order")
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("display_name, is_admin")
      .order("display_name"),
  ]);

  const errors = [
    configRes.error,
    activitiesRes.error,
    profilesRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load the rules</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e) => e?.message).join("\n")}
        </pre>
      </main>
    );
  }

  const cfg = configRes.data!;
  const activities = activitiesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const weeks = weeksBetween(cfg.start_date, cfg.end_date);

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">The rules</h1>
        <span aria-hidden className="w-10" />
      </header>

      <Section title="Period">
        <p className="text-sm text-neutral-700">
          {formatShortDate(cfg.start_date)} – {formatShortDate(cfg.end_date)}{" "}
          <span className="text-neutral-400">({weeks} weeks)</span>
        </p>
      </Section>

      <Section title="Weekly target">
        <p className="text-sm text-neutral-700">
          At least <strong>{cfg.min_per_week} sessions</strong> per week (Mon–Sun).
        </p>
        <p className="mt-1 text-sm text-neutral-700">
          Each session must be at least <strong>45 minutes</strong>. Honor system
          — we trust each other on the timer.
        </p>
      </Section>

      <Section title="Penalty">
        <p className="text-sm text-neutral-700">
          Below {cfg.min_per_week} sessions in a week ={" "}
          <strong>
            {formatCents(cfg.fee_per_missed_week_cents, cfg.currency)}
          </strong>{" "}
          into the bucket. Flat fee — same whether you missed by one session or
          three.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          The current week never counts as missed until it ends. You can still
          back-fill missed days within the current Mon–Sun window.
        </p>
      </Section>

      <Section title="Activities that count">
        <ul className="grid grid-cols-3 gap-2">
          {activities.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm shadow-sm"
            >
              <span className="text-lg leading-none">{a.emoji ?? "•"}</span>
              <span>{a.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Challenges">
        <p className="text-sm text-neutral-700">
          Anyone can challenge anyone for any amount. The challenged person can
          accept or decline. If accepted, the challenge is binding.
        </p>
        <p className="mt-1 text-sm text-neutral-700">
          The admin (Marlo) resolves accepted challenges by picking the loser.
          The loser&apos;s amount is added to the bucket — same place as missed-week
          fees.
        </p>
      </Section>

      <Section title="The bucket">
        <p className="text-sm text-neutral-700">
          All missed-week fees and lost challenges accumulate virtually. No real
          money moves through the app.
        </p>
        <p className="mt-1 text-sm text-neutral-700">
          We settle up in person at the end of the challenge and spend the
          bucket on something fun — to be agreed by the group.
        </p>
      </Section>

      <Section title="Players">
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {profiles.map((p) => (
            <li
              key={p.display_name}
              className="flex items-center justify-between p-3 text-sm"
            >
              <span className="font-medium">{p.display_name}</span>
              {p.is_admin ? (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  admin
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <p className="pt-4 text-center text-xs text-neutral-400">
        Edit anything wrong by tweaking <code>challenge_config</code> in
        Supabase — this page reads it live.
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
