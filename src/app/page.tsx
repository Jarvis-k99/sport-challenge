import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/dashboard/Header";
import WeekProgress, {
  type ProgressRow,
} from "@/components/dashboard/WeekProgress";
import BucketSummary, {
  type BucketRow,
} from "@/components/dashboard/BucketSummary";
import Challenges, {
  type ChallengeRow,
} from "@/components/dashboard/Challenges";
import NavCard from "@/components/dashboard/NavCard";

// The page reads cookies + Supabase data per-request — never static.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [profileRes, progressRes, bucketRes, challengesRes, configRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, is_admin")
        .eq("id", user.id)
        .single(),
      supabase
        .from("v_current_week_progress")
        .select(
          "user_id, display_name, is_admin, min_per_week, session_count, threshold_met, week_start",
        ),
      supabase
        .from("v_bucket_summary")
        .select(
          "user_id, display_name, missed_weeks, missed_fee_cents, lost_challenges_cents, total_owed_cents",
        ),
      supabase
        .from("v_challenges")
        .select("*")
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false }),
      supabase
        .from("challenge_config")
        .select("currency")
        .eq("id", 1)
        .single(),
    ]);

  const errors = [
    profileRes.error,
    progressRes.error,
    bucketRes.error,
    challengesRes.error,
    configRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn’t load the dashboard</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e) => e?.message).join("\n")}
        </pre>
      </main>
    );
  }

  const profile = profileRes.data!;
  const progress = (progressRes.data ?? []) as ProgressRow[];
  const bucket = (bucketRes.data ?? []) as BucketRow[];
  const challenges = (challengesRes.data ?? []) as ChallengeRow[];
  const currency = configRes.data?.currency ?? "EUR";

  const adminHasResolveWork =
    profile.is_admin && challenges.some((c) => c.status === "active");

  return (
    <main className="flex flex-col gap-6 pb-12 pt-2">
      <Header displayName={profile.display_name} isAdmin={profile.is_admin} />

      {/* --- Top action section --- */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/log"
          className="rounded-xl bg-bucket-500 py-3 text-center text-base font-semibold text-white shadow-sm transition active:scale-[0.99]"
        >
          + Log activity
        </Link>
        <Link
          href="/challenge/new"
          className="rounded-xl bg-purple-600 py-3 text-center text-base font-semibold text-white shadow-sm transition active:scale-[0.99]"
        >
          + Challenge
        </Link>
      </div>

      <WeekProgress rows={progress} currentUserId={user.id} />
      <BucketSummary rows={bucket} currency={currency} currentUserId={user.id} />
      <Challenges
        challenges={challenges}
        currentUserId={user.id}
        currency={currency}
      />

      {/* --- Sub-page navigation --- */}
      <div className="flex flex-col gap-2 pt-2">
        <NavCard
          href="/stats"
          icon="📊"
          title="Statistics"
          subtitle="Leaderboard and per-person breakdowns."
        />
        <NavCard
          href="/rules"
          icon="📖"
          title="Read the rules"
          subtitle="Period, weekly target, fee, activities."
        />
      </div>

      {profile.is_admin ? (
        <Link
          href="/admin"
          className={`block w-full rounded-xl border py-2.5 text-center text-sm font-semibold shadow-sm transition ${
            adminHasResolveWork
              ? "border-purple-500 bg-purple-50 text-purple-800"
              : "border-neutral-200 bg-white text-neutral-700"
          }`}
        >
          {adminHasResolveWork
            ? "Admin · resolve active challenges →"
            : "Admin panel →"}
        </Link>
      ) : null}
    </main>
  );
}
