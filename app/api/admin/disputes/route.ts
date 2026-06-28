import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("disputes")
    .select("*, errand:errand_id(title, status, customer_id, assigned_runner_id), raised_by_profile:raised_by(full_name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, resolution, status } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (resolution) updates.resolution = resolution;
  if (status) {
    updates.status = status;
    if (status === "resolved") {
      updates.resolved_by = user.id;
      updates.resolved_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase.from("disputes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the person who raised the dispute
  if (data && status === "resolved") {
    await supabase.from("notifications").insert({
      user_id: data.raised_by,
      title: "Dispute resolved",
      body: resolution || "Your dispute has been resolved by an admin.",
      related_errand_id: data.errand_id,
    });
  }

  return NextResponse.json(data);
}
