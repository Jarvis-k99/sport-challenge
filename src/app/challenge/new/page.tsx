import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewChallengeForm, { type Opponent } from "./new-form";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New challenge" };
export const dynamic = "force-dynamic";

export default async function NewChallengePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .neq("id", user.id)
    .order("display_name");

  if (error) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load opponents</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {error.message}
        </pre>
      </main>
    );
  }

  const opponents = (data ?? []) as Opponent[];

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">New challenge</h1>
        <span aria-hidden className="w-10" />
      </header>

      <p className="text-sm text-neutral-600">
        Stake an amount on something specific. If your opponent accepts,
        the loser pays into the bucket.
      </p>

      <NewChallengeForm opponents={opponents} />
    </main>
  );
}
