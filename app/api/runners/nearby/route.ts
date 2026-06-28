import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "0");
  const lng = parseFloat(url.searchParams.get("lng") || "0");
  const radius = parseFloat(url.searchParams.get("radius") || "10"); // km

  // Fetch available runners (verified + available)
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, rating, rating_count, lat, lng, is_available, is_verified")
    .eq("is_available", true)
    .eq("is_verified", true)
    .in("role", ["runner", "both"])
    .neq("id", user.id)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by distance (Haversine) in JS since we don't have PostGIS
  const runners = (data ?? []).map(r => {
    const d = haversine(lat, lng, Number(r.lat), Number(r.lng));
    return { ...r, distance_km: Math.round(d * 100) / 100 };
  }).filter(r => r.distance_km <= radius)
    .sort((a, b) => a.distance_km - b.distance_km);

  return NextResponse.json(runners);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
