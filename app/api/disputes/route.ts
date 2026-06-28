import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("disputes")
    .select("*, errand:errand_id(title, status), raised_by_profile:raised_by(full_name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { errand_id, category, reason } = await request.json();
  if (!errand_id || !reason) {
    return NextResponse.json({ error: "errand_id and reason are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("disputes")
    .insert({ errand_id, raised_by: user.id, category: category || "other", reason, status: "open" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update errand status to disputed
  await supabase.from("errands").update({ status: "disputed" }).eq("id", errand_id);

  return NextResponse.json(data);
}
