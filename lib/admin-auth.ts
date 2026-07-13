import { NextResponse } from "next/server";
import { createAdminClient, createServerSupabase } from "./supabase-server";
import { getSupabaseServiceRoleKey, isPrivilegedSupabaseKey } from "./supabase-config";

export async function requireAdmin(superAdminOnly = false) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, is_super_admin, is_suspended")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin || profile.is_suspended || (superAdminOnly && !profile.is_super_admin)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, user, profile, supabase };
}

export function privilegedAdminClient() {
  const key = getSupabaseServiceRoleKey();
  return isPrivilegedSupabaseKey(key) ? createAdminClient() : null;
}

export async function recordAdminAction(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | number | null,
  metadata: Record<string, unknown> = {},
) {
  const admin = privilegedAdminClient();
  if (!admin) return;
  await admin.from("admin_audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId === null ? null : String(targetId),
    metadata,
  });
}
