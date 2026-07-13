import { privilegedAdminClient, recordAdminAction, requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase() || "";
  const [{ data: profiles, error }, { data: authUsers, error: authError }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }).limit(250),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error || authError) return NextResponse.json({ error: error?.message || authError?.message }, { status: 500 });

  const authById = new Map(authUsers.users.map(user => [user.id, user]));
  const users = (profiles ?? []).map(profile => {
    const authUser = authById.get(profile.id);
    return {
      ...profile,
      email: authUser?.email ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      banned_until: authUser?.banned_until ?? null,
    };
  }).filter(user => !search || `${user.full_name || ""} ${user.email || ""} ${user.phone || ""}`.toLowerCase().includes(search));

  return NextResponse.json({
    users,
    viewer: { id: context.user.id, is_super_admin: Boolean(context.profile.is_super_admin) },
  });
}

export async function POST(request: Request) {
  const context = await requireAdmin(true);
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { email, password, full_name, role = "customer", make_admin = false } = await request.json();
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  if (typeof password !== "string" || password.length < 12) return NextResponse.json({ error: "Temporary password must be at least 12 characters." }, { status: 400 });
  if (!new Set(["customer", "runner", "both"]).has(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || "", role },
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message || "Account creation failed." }, { status: 400 });

  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: full_name || "",
    role,
    is_admin: Boolean(make_admin),
    is_super_admin: false,
    updated_at: new Date().toISOString(),
  });
  await admin.from("wallets").upsert({ user_id: data.user.id }, { onConflict: "user_id" });
  await recordAdminAction(context.user.id, "account_created", "profile", data.user.id, { email: email.trim().toLowerCase(), role, make_admin: Boolean(make_admin) });
  return NextResponse.json({ success: true, id: data.user.id });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { id, action } = await request.json();
  if (typeof id !== "string" || typeof action !== "string") return NextResponse.json({ error: "Account and action are required." }, { status: 400 });

  const superActions = new Set(["grant_admin", "revoke_admin", "grant_super_admin", "revoke_super_admin", "suspend", "restore", "delete"]);
  if (superActions.has(action) && !context.profile.is_super_admin) return NextResponse.json({ error: "Super-admin access required." }, { status: 403 });
  if (id === context.user.id && new Set(["revoke_admin", "revoke_super_admin", "suspend", "delete"]).has(action)) {
    return NextResponse.json({ error: "You cannot remove or suspend your own access." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "verify") updates.is_verified = true;
  else if (action === "unverify") updates.is_verified = false;
  else if (action === "grant_admin") updates.is_admin = true;
  else if (action === "revoke_admin") { updates.is_admin = false; updates.is_super_admin = false; }
  else if (action === "grant_super_admin") { updates.is_admin = true; updates.is_super_admin = true; }
  else if (action === "revoke_super_admin") updates.is_super_admin = false;
  else if (action === "suspend" || action === "restore") {
    const suspended = action === "suspend";
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: suspended ? "876000h" : "none" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    updates.is_suspended = suspended;
    updates.is_available = false;
  } else if (action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await recordAdminAction(context.user.id, action, "profile", id);
    return NextResponse.json({ success: true, deleted: true });
  } else {
    return NextResponse.json({ error: "Unsupported account action." }, { status: 400 });
  }

  const { data, error } = await admin.from("profiles").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAdminAction(context.user.id, action, "profile", id);
  return NextResponse.json(data);
}
