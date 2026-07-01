import { createAdminClient } from "@/lib/supabase-server";
import { getSupabaseServiceRoleKey } from "@/lib/supabase-config";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";

const roles: UserRole[] = ["customer", "runner", "both"];

export async function POST(request: Request) {
  const serviceKey = getSupabaseServiceRoleKey();

  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "Server signup is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel to create accounts without email-rate-limit errors.",
      },
      { status: 503 },
    );
  }

  const { full_name, email, password, role } = await request.json();
  const selectedRole: UserRole = roles.includes(role) ? role : "customer";

  if (!full_name || String(full_name).trim().length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const normalizedEmail = String(email).trim().toLowerCase();
  const fullName = String(full_name).trim();

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: selectedRole,
    },
  });

  if (error) {
    const alreadyExists =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");

    return NextResponse.json(
      { error: alreadyExists ? "An account already exists for this email. Please log in." : error.message },
      { status: alreadyExists ? 409 : 400 },
    );
  }

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

  return NextResponse.json({ success: true });
}
