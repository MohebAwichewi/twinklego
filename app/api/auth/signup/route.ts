import { createAdminClient } from "@/lib/supabase-server";
import {
  getSupabasePublicKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isPrivilegedSupabaseKey,
} from "@/lib/supabase-config";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";

const roles: UserRole[] = ["customer", "runner", "both"];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 400 });
  }

  const { full_name, email, password, role } = body;
  const selectedRole: UserRole = typeof role === "string" && roles.includes(role as UserRole) ? role as UserRole : "customer";

  if (typeof full_name !== "string" || full_name.trim().length < 2) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (typeof password !== "string" || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const serviceKey = getSupabaseServiceRoleKey();
  if (!isPrivilegedSupabaseKey(serviceKey)) {
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable because the secure server key is not configured." },
      { status: 503 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const fullName = full_name.trim();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: selectedRole },
  });

  if (error) {
    const duplicate = /already|registered|exists/i.test(error.message);
    if (!duplicate) return NextResponse.json({ error: error.message }, { status: error.status || 400 });

    const publicClient = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await publicClient.auth.signInWithPassword({ email: normalizedEmail, password });
    if (!signInError) return NextResponse.json({ success: true, accountAlreadyExists: true });

    if (/email not confirmed/i.test(signInError.message)) {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = users.users.find(user => user.email?.toLowerCase() === normalizedEmail);
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, {
          email_confirm: true,
          user_metadata: { ...existing.user_metadata, full_name: fullName, role: selectedRole },
        });
        await ensureProfile(admin, existing.id, fullName, selectedRole);
        return NextResponse.json({ success: true, accountAlreadyExists: true });
      }
    }

    return NextResponse.json({ error: "An account already exists for this email. Log in with its password." }, { status: 409 });
  }

  if (data.user) await ensureProfile(admin, data.user.id, fullName, selectedRole);
  return NextResponse.json({ success: true });
}

async function ensureProfile(admin: ReturnType<typeof createAdminClient>, id: string, fullName: string, role: UserRole) {
  await admin.from("profiles").upsert({ id, full_name: fullName, role, updated_at: new Date().toISOString() });
  await admin.from("wallets").upsert({ user_id: id }, { onConflict: "user_id" });
}
