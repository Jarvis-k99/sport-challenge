import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/format";
import ResolveForm from "./resolve-form";
import type { ChallengeRow } from "@/components/dashboard/Challenges";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Admins only</h1>
        <p className="text-sm text-neutral-600">
          You don’t have permission to view this page.
        </p>
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  const [activeRes, recentRes, configRes] = await Promise.all([
    supabase
      .from("v_challenges")
      .select("*")
      .eq("status", "active")
      .order("accepted_at", { ascending: true }),
    supabase
      .from("v_challenges")
      .select("*")
      .eq("status", "inactive")
      .order("resolved_at", { ascending: false })
      .limit(10),
    supabase
      .from("challenge_config")
      .select("currency")
      .eq("id", 1)
      .single(),
  ]);

  const errors = [activeRes.error, recentRes.error, configRes.error].filter(
    Boolean,
  );
  if (errors.length > 0) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load admin panel</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e) => e?.message).join("\n")}
        </pre>
      </main>
    );
  }

  const active = (activeRes.data ?? []) as ChallengeRow[];
  const recent = (recentRes.data ?? []) as ChallengeRow[];
  const currency = configRes.data?.currency ?? "EUR";

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Admin · resolve</h1>
        <span aria-hidden className="w-10" />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
            Nothing to resolve right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl border border-purple-200 bg-white p-4 shadow-sm"
              >
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
                <ResolveForm
                  challengeId={c.id}
                  challenger={{ id: c.challenger_id, name: c.challenger_name }}
                  target={{ id: c.target_id, name: c.target_name }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Recently resolved
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
            No resolutions yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {recent.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    {c.challenger_name}
                    <span className="text-neutral-400"> vs </span>
                    {c.target_name}
                  </span>
                  <span className="text-sm font-semibold text-neutral-700">
                    {formatCents(c.amount_cents, currency)}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  Loser: {c.loser_name ?? "—"}
                </span>
                <p className="text-sm text-neutral-700">{c.description}</p>
                {c.resolution_note ? (
                  <p className="text-xs italic text-neutral-500">
                    {c.resolution_note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
