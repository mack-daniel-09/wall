import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Only the origin is needed (https://<ref>.supabase.co). Strip anything pasted after it,
// such as "/rest/v1/", which would otherwise cause "Invalid path specified in request URL".
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const url = rawUrl?.replace(/\/(rest|storage|auth|realtime)\/v1.*$/, "").replace(/\/+$/, "")
// Either the new publishable key (sb_publishable_...) or the legacy anon key (eyJ...) works.
const key =
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()

// Ignore the placeholder values copied from .env.example.
const isPlaceholder = (value?: string) =>
  !value || value.includes("your-project-ref") || value.includes("xxxxxxxx")

export const isSupabaseConfigured = !isPlaceholder(url) && !isPlaceholder(key)

let client: SupabaseClient | undefined

/**
 * One shared client. The app has no user sign-in, so the same client works
 * on the server (initial page load) and in the browser (posting + realtime).
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured || !url || !key) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    )
  }
  client ??= createClient(url, key, { auth: { persistSession: false } })
  return client
}
