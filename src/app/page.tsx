import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/dashboard/Header";
import WeekProgress, {
  type ProgressRow,
} from "@/components/dashboard/WeekProgress";
import BucketSummary, {
  type BucketRow,
} from "@/components/dashboard/BucketSummary";
import RecentActivity, {
  type RecentEntry,
} from "@/components/dashboard/RecentActivity";

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

  const [
    profileRes,
    progressRes,
    bucketRes,
    recentRes,
    configRes,
  ] = await Promise.all([
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
      .from("v_recent_entries")
      .select(
        "id, user_id, display_name, activity_type_id, activity_name, activity_emoji, activity_date, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("challenge_config")
      .select("currency, timezone")
      .eq("id", 1)
      .single(),
  ]);

  const errors = [
    profileRes.error,
    progressRes.error,
    bucketRes.error,
    recentRes.error,
    configRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return (
      <main className="flex flex-col gap-4 pt-6">
        <h1 className="text-xl font-bold">Couldn't load the dashboard</h1>
        <pre className="overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e) => e?.message).join("\n")}
        </pre>
      </main>
    );
  }

  const profile = profileRes.data!;
  const progress = (progressRes.data ?? []) as ProgressRow[];
  const bucket = (bucketRes.data ?? []) as BucketRow[];
  const recent = (recentRes.data ?? []) as RecentEntry[];
  const currency = configRes.data?.currency ?? "EUR";

  // Compute "today" in the challenge's local timezone for relative-day labels.
  const todayLocal = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: configRes.data?.timezone ?? "Europe/Berlin",
    }),
  );

  return (
    <main className="flex flex-col gap-6 pb-24 pt-2">
      <Header displayName={profile.display_name} isAdmin={profile.is_admin} />
      <WeekProgress rows={progress} currentUserId={user.id} />
      <BucketSummary rows={bucket} currency={currency} currentUserId={user.id} />
      <RecentActivity entries={recent} todayLocal={todayLocal} />
      <p className="text-center text-xs text-neutral-400">
        Build: phase 3 — auth + dashboard read.
      </p>
    </main>
  );
}
