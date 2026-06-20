"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LogState = { error?: string };

const MAX_NOTE_LENGTH = 200;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB — under Vercel Hobby's 4.5 MB body cap
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function addEntry(
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const activityTypeId = Number(formData.get("activity_type_id"));
  const activityDate = String(formData.get("activity_date") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const photoEntry = formData.get("photo");
  const photo =
    photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

  if (!activityTypeId || !activityDate) {
    return { error: "Pick an activity and a day." };
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return { error: `Notes are capped at ${MAX_NOTE_LENGTH} characters.` };
  }

  if (photo) {
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return { error: "Photo must be JPG, PNG, or WebP." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "Photo must be under 4 MB." };
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Upload the photo first (if any). If the entry insert later fails
  // we'll roll back by deleting the orphan.
  let photoPath: string | null = null;
  if (photo) {
    const objectName = `${user.id}/${randomUUID()}.${extFor(photo.type)}`;
    const { error: uploadErr } = await supabase.storage
      .from("activity-photos")
      .upload(objectName, photo, { contentType: photo.type });
    if (uploadErr) {
      return { error: `Photo upload failed: ${uploadErr.message}` };
    }
    photoPath = objectName;
  }

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    activity_type_id: activityTypeId,
    activity_date: activityDate,
    note: note || null,
    photo_path: photoPath,
  });

  if (error) {
    // Roll back the orphaned upload.
    if (photoPath) {
      await supabase.storage.from("activity-photos").remove([photoPath]);
    }
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

  // Look up the photo so we can delete it after the entry is gone.
  const { data: entry } = await supabase
    .from("entries")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase
    .from("entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (entry?.photo_path) {
    await supabase.storage
      .from("activity-photos")
      .remove([entry.photo_path]);
  }

  revalidatePath("/");
  revalidatePath("/log");
}
