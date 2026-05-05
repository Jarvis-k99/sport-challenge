import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-col gap-6 pt-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">🏋️ Sport Challenge</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Phase 1 scaffold is live. Auth + dashboard land in phase 3.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Connection check
        </h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Supabase URL</dt>
            <dd className="font-mono text-xs">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ set" : "❌ missing"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Anon key</dt>
            <dd className="font-mono text-xs">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ set" : "❌ missing"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Session</dt>
            <dd className="font-mono text-xs">
              {user ? `signed in as ${user.email}` : "not signed in (expected)"}
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-xs text-neutral-400">
        Build: phase 1 — Next.js + Supabase wiring.
      </p>
    </main>
  );
}
