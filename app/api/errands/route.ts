import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("errands")
    .select("*, customer:customer_id(*), assigned_runner:assigned_runner_id(*)")
    .or(`customer_id.eq.${user.id},assigned_runner_id.eq.${user.id},status.eq.posted`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, category, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, price, distance_km } = body;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("id", user.id)
    .single();

  if (!profile?.is_verified) {
    return NextResponse.json(
      { error: "Please complete identity verification before posting errands." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("errands")
    .insert({
      customer_id: user.id,
      title,
      description,
      category: category || "errand",
      pickup_lat, pickup_lng,
      dropoff_lat, dropoff_lng,
      pickup_address, dropoff_address,
      price: price || 0,
      distance_km,
      status: "posted",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
