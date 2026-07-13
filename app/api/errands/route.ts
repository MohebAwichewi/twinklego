import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { estimatePrice, haversineDistance } from "@/lib/geo";

const categories = new Set(["groceries", "delivery", "home_help", "errand", "temporary_job", "service_request"]);

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
  const { title, description, category, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address } = body;

  if (typeof title !== "string" || title.trim().length < 3) return NextResponse.json({ error: "Enter a clear task title." }, { status: 400 });
  if (!categories.has(category)) return NextResponse.json({ error: "Choose a valid task category." }, { status: 400 });
  if (typeof pickup_address !== "string" || !pickup_address.trim()) return NextResponse.json({ error: "Choose a pickup address from the map search." }, { status: 400 });

  const pickupLat = Number(pickup_lat);
  const pickupLng = Number(pickup_lng);
  const dropoffLat = dropoff_lat === null || dropoff_lat === undefined ? null : Number(dropoff_lat);
  const dropoffLng = dropoff_lng === null || dropoff_lng === undefined ? null : Number(dropoff_lng);
  if (!validCoordinates(pickupLat, pickupLng)) return NextResponse.json({ error: "Choose a valid pickup location from the map." }, { status: 400 });
  if (dropoff_address && (!validCoordinates(dropoffLat, dropoffLng))) return NextResponse.json({ error: "Choose a valid dropoff location from the map." }, { status: 400 });

  const distanceKm = dropoffLat !== null && dropoffLng !== null
    ? Math.round(haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng) * 100) / 100
    : 0;
  const price = estimatePrice(distanceKm);

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
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      category,
      pickup_lat: pickupLat, pickup_lng: pickupLng,
      dropoff_lat: dropoffLat, dropoff_lng: dropoffLng,
      pickup_address: pickup_address.trim(),
      dropoff_address: typeof dropoff_address === "string" ? dropoff_address.trim() || null : null,
      price,
      distance_km: distanceKm,
      status: "posted",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

function validCoordinates(lat: number | null, lng: number | null) {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
