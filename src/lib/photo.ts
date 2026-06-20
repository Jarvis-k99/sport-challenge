/**
 * Build the public URL for a path stored in the `activity-photos`
 * Storage bucket. We construct the URL directly rather than calling
 * supabase.storage.getPublicUrl() so this can run in synchronous
 * server-component code without a roundtrip.
 */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/activity-photos/${path}`;
}
