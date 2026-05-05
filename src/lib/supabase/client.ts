import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use inside React Client Components.
 * Reads cookies set by the middleware/server client so the same session
 * is shared across SSR, RSC, and the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
