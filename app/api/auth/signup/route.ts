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
  const selectedRole: UserRole =
    typeof role === "string" && roles.includes(role as UserRole)
      ? (role as UserRole)
      : "customer";

  if (typeof full_name !== "string" || full_name.trim().length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const fullName = full_name.trim();
  const serviceKey = getSupabaseServiceRoleKey();

  if (isPrivilegedSupabaseKey(serviceKey)) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: selectedRole,
      },
    });

    if (!error) {
      const user = data.user;

      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: fullName,
          role: selectedRole,
          updated_at: new Date().toISOString(),
        });

        await supabase.from("wallets").upsert({ user_id: user.id }, { onConflict: "user_id" });
      }

      return NextResponse.json({ success: true, requiresEmailConfirmation: false });
    }

    const alreadyExists =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");

    if (alreadyExists) {
      return NextResponse.json(
        { error: "An account already exists for this email. Please log in." },
        { status: 409 },
      );
    }
  }

  const publicClient = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await publicClient.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name: fullName, role: selectedRole },
      emailRedirectTo: `${new URL(request.url).origin}/api/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("rate limit")
      ? "Too many confirmation emails were requested. Wait a few minutes, then try again."
      : error.message;
    return NextResponse.json({ error: message }, { status: error.status || 400 });
  }

  return NextResponse.json({
    success: true,
    requiresEmailConfirmation: !data.session,
  });
}
