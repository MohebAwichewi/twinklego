import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createRawClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "CRITICAL: Supabase variables are missing! Check your .env file. " +
    `NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? "Set" : "Missing"}, ` +
    `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "Set" : "Missing"}`
  );
}

const url = SUPABASE_URL || "https://placeholder.supabase.co";
const key = SUPABASE_ANON_KEY || "placeholder-key";

/**
 * Server client - call from Server Components, Route Handlers, Server Actions
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ignored in Server Components (read-only)
        }
      },
    },
  });
}

/**
 * Admin client - service role, bypasses RLS (use only in trusted server contexts)
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! Admin actions will fail.");
  }
  return createRawClient(url, serviceKey || "placeholder-service-key");
}

