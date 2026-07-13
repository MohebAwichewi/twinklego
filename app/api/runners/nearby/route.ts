import { createServerSupabase } from "@/lib/supabase-server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const requestedRadius = Number(url.searchParams.get("radius") || "10");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });
  }
  const radius = Number.isFinite(requestedRadius) ? Math.min(Math.max(requestedRadius, 1), 100) : 10;

  const dataClient = privilegedAdminClient() ?? supabase;

  // Fetch available runners (verified + available)
  const { data, error } = await dataClient
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
