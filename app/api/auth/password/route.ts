import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase-config";
import { privilegedAdminClient } from "@/lib/admin-auth";

export async function PATCH(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password request." }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  if (newPassword.length < 12) return NextResponse.json({ error: "Your new password must be at least 12 characters." }, { status: 400 });
  if (newPassword === currentPassword) return NextResponse.json({ error: "Choose a different password." }, { status: 400 });

  const verifier = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: passwordError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (passwordError) return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Password changes are temporarily unavailable." }, { status: 503 });

  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) return NextResponse.json({ error: "Your password could not be changed. Try again shortly." }, { status: 500 });

  return NextResponse.json({ success: true });
}
