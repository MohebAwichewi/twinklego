import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("verifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? null);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id_type, id_number, id_image_url } = await request.json();
  if (!id_type || !id_number) {
    return NextResponse.json({ error: "ID type and number are required." }, { status: 400 });
  }
  if (typeof id_image_url !== "string" || !id_image_url.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Upload a valid ID document before submitting." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("verifications")
    .insert({ user_id: user.id, id_type, id_number, id_image_url, status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
