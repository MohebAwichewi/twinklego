import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, getSupabaseUrl } from "./supabase-config";

const url = getSupabaseUrl();
const key = getSupabasePublicKey();
let browserClient: SupabaseClient | undefined;

if (typeof window !== "undefined" && (!url || !key)) {
  console.error(
    "TwinkleGo Client Error: Supabase URL or publishable key is not defined in environment variables."
  );
}

/**
 * Browser client - call from Client Components ("use client")
 */
export function createClient() {
  if (!browserClient) browserClient = createBrowserClient(url, key);
  return browserClient;
}

