import { privilegedAdminClient } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const configuredSecret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
  if (!configuredSecret || configuredSecret.length < 24) {
    return NextResponse.json({ error: "Super-admin bootstrap is not configured." }, { status: 503 });
  }

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service-role key is not configured." }, { status: 503 });

  const { secret, email, password, full_name } = await request.json();
  if (secret !== configuredSecret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  if (typeof password !== "string" || password.length < 12) return NextResponse.json({ error: "Temporary password must be at least 12 characters." }, { status: 400 });

  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_super_admin", true);
  if ((count ?? 0) > 0) return NextResponse.json({ error: "A super-admin account already exists." }, { status: 409 });

  const normalizedEmail = email.trim().toLowerCase();
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = users.users.find(candidate => candidate.email?.toLowerCase() === normalizedEmail) ?? null;

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: full_name || user.user_metadata?.full_name || "Super Admin", role: "both" },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "Super Admin", role: "both" },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    user = data.user;
  }

  if (!user) return NextResponse.json({ error: "Could not create the super-admin account." }, { status: 500 });

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    full_name: full_name || "Super Admin",
    role: "both",
    is_verified: true,
    is_admin: true,
    is_super_admin: true,
    is_suspended: false,
    updated_at: new Date().toISOString(),
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  await admin.from("wallets").upsert({ user_id: user.id }, { onConflict: "user_id" });
  await admin.from("admin_audit_logs").insert({ actor_id: user.id, action: "super_admin_bootstrapped", target_type: "profile", target_id: user.id });

  return NextResponse.json({ success: true, user_id: user.id, email: normalizedEmail });
}
