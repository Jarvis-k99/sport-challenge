import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Hit once a day by a Vercel cron (see vercel.json). Supabase's free tier
// pauses a project after ~7 days without activity; this cheap anonymous
// request counts as activity and keeps the database awake between seasons.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  // RLS returns zero rows for anon — the point is only to touch the DB.
  const { error } = await supabase
    .from("challenge_config")
    .select("id")
    .limit(1);
  return NextResponse.json({ ok: !error, at: new Date().toISOString() });
}
