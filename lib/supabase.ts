import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== "undefined" && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error(
    "TwinkleGo Client Error: Supabase URL or Anon Key is not defined in environment variables."
  );
}

const url = SUPABASE_URL || "https://placeholder.supabase.co";
const key = SUPABASE_ANON_KEY || "placeholder-key";

/**
 * Browser client - call from Client Components ("use client")
 */
export function createClient() {
  return createBrowserClient(url, key);
}

