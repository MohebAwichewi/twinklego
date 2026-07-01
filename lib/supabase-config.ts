const DEFAULT_SUPABASE_URL = "https://qtgvfnlageqhhtrpxkrw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QT5IrVb-WhEdVBUEjWWJbg_tquFQfDB";

function cleanEnv(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const unquoted = trimmed.replace(/^['"]|['"]$/g, "").trim();
  if (!unquoted || unquoted === "placeholder-key" || unquoted.includes("supabase-demo")) {
    return "";
  }

  return unquoted;
}

export function getSupabaseUrl() {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
}

export function getSupabasePublicKey() {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseServiceRoleKey() {
  return cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseConfigSummary() {
  const key = getSupabasePublicKey();
  const serviceKey = getSupabaseServiceRoleKey();
  return {
    url: getSupabaseUrl(),
    keyKind: key.startsWith("sb_publishable_") ? "publishable" : "anon",
    keyPrefix: key.slice(0, 18),
    hasUsableKey: Boolean(key),
    hasServiceRoleKey: Boolean(serviceKey),
  };
}
