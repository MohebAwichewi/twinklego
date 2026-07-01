import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "./supabase-config";

const url = getSupabaseUrl();
const key = getSupabasePublicKey();

if (!url || !key) {
  console.error(
    "CRITICAL: Supabase variables are missing! Check your .env file. " +
    `NEXT_PUBLIC_SUPABASE_URL: ${url ? "Set" : "Missing"}, ` +
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? "Set" : "Missing"}`
  );
}

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
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! Admin actions will fail.");
  }
  return createRawClient(url, serviceKey || key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

