"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LogState = { error?: string };

export async function addEntry(
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const activityTypeId = Number(formData.get("activity_type_id"));
  const activityDate = String(formData.get("activity_date") ?? "");

  if (!activityTypeId || !activityDate) {
    return { error: "Pick an activity and a day." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    activity_type_id: activityTypeId,
    activity_date: activityDate,
  });

  if (error) {
    // Most likely RLS rejection (date outside current week, etc.)
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/log");
  redirect("/");
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already restricts to (own entry AND in current week); the eq()
  // here is just a belt-and-braces guard.
  await supabase.from("entries").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/");
  revalidatePath("/log");
}
