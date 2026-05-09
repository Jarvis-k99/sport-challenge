"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ChallengeFormState = { error?: string };

const MAX_AMOUNT_EUR = 1000;

/**
 * Create a new challenge as the current user (challenger).
 * Inserts with status='pending'; the target sees it on their dashboard
 * and can accept (-> active) or decline (-> declined).
 */
export async function createChallenge(
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const targetId = String(formData.get("target_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount_eur") ?? "").replace(",", ".");

  if (!targetId) return { error: "Pick someone to challenge." };
  if (!description) return { error: "Add a description for the challenge." };
  if (description.length > 500)
    return { error: "Description is too long (500 char max)." };

  const amountEur = Number(amountRaw);
  if (!Number.isFinite(amountEur) || amountEur <= 0) {
    return { error: "Enter a positive amount in €." };
  }
  if (amountEur > MAX_AMOUNT_EUR) {
    return { error: `Keep it under €${MAX_AMOUNT_EUR}.` };
  }
  const amountCents = Math.round(amountEur * 100);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (targetId === user.id) {
    return { error: "You can't challenge yourself." };
  }

  const { error } = await supabase.from("challenges").insert({
    challenger_id: user.id,
    target_id: targetId,
    description,
    amount_cents: amountCents,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/");
}

/** Target accepts a pending challenge -> active. */
export async function acceptChallenge(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase
    .from("challenges")
    .update({ status: "active" })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/");
}

/** Target declines a pending challenge -> declined. */
export async function declineChallenge(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase
    .from("challenges")
    .update({ status: "declined" })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/");
}

/** Challenger cancels (deletes) their own still-pending challenge. */
export async function cancelChallenge(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase
    .from("challenges")
    .delete()
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/");
}

/**
 * Admin resolves an active challenge: pick the loser, set status='inactive'.
 * The trigger auto-stamps resolved_at; v_bucket_summary then includes the
 * loser's amount in their "lost challenges" line.
 */
export async function resolveChallenge(
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const id = String(formData.get("id") ?? "");
  const loserId = String(formData.get("loser_id") ?? "");
  const note = String(formData.get("resolution_note") ?? "").trim() || null;

  if (!id || !loserId) {
    return { error: "Pick a loser." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("challenges")
    .update({
      status: "inactive",
      loser_id: loserId,
      resolution_note: note,
    })
    .eq("id", id)
    .eq("status", "active");

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}
