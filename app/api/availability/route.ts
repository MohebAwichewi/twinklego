import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { is_available } = await request.json();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_verified")
    .eq("id", user.id)
    .single();

  if (!profile?.is_verified || !["runner", "both"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only verified runners can use Available Mode." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_available, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lat, lng } = await request.json();
  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  // Update profile location
  await supabase.from("profiles").update({ lat, lng, updated_at: new Date().toISOString() }).eq("id", user.id);

  // Store GPS record
  const { error } = await supabase.from("gps_records").insert({ user_id: user.id, lat, lng });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
