import { haversineDistance, estimateEtaMinutes } from "@/lib/geo";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { TaskTrackingPhase } from "@/lib/types";

const phases: TaskTrackingPhase[] = [
  "accepted",
  "heading_to_pickup",
  "picked_up",
  "en_route_delivery",
  "delivered",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: errand, error: errandError } = await supabase
    .from("errands")
    .select("*")
    .eq("id", id)
    .single();

  if (errandError || !errand) {
    return NextResponse.json({ error: errandError?.message || "Errand not found" }, { status: 404 });
  }

  const isParty = errand.customer_id === user.id || errand.assigned_runner_id === user.id;
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("task_tracking")
    .select("*")
    .eq("errand_id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const requestedPhase = body.phase as TaskTrackingPhase | undefined;
  const lat = body.lat === undefined ? null : Number(body.lat);
  const lng = body.lng === undefined ? null : Number(body.lng);

  const { data: errand, error: errandError } = await supabase
    .from("errands")
    .select("*")
    .eq("id", id)
    .single();

  if (errandError || !errand) {
    return NextResponse.json({ error: errandError?.message || "Errand not found" }, { status: 404 });
  }

  if (errand.assigned_runner_id !== user.id) {
    return NextResponse.json({ error: "Only the assigned runner can update live tracking." }, { status: 403 });
  }

  if (!["accepted", "in_progress"].includes(errand.status)) {
    return NextResponse.json({ error: "Live tracking is only available while a task is active." }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("task_tracking")
    .select("*")
    .eq("errand_id", id)
    .maybeSingle();

  const phase = requestedPhase ?? current?.phase ?? "accepted";
  if (!phases.includes(phase)) {
    return NextResponse.json({ error: "Invalid tracking phase." }, { status: 400 });
  }

  if (current && requestedPhase && phases.indexOf(requestedPhase) < phases.indexOf(current.phase)) {
    return NextResponse.json({ error: "Tracking phase cannot move backwards." }, { status: 400 });
  }

  const metrics = calculateTrackingMetrics(errand, phase, lat, lng);
  const timestampField = `${phase}_at`;
  const updates: Record<string, unknown> = {
    errand_id: Number(id),
    phase,
    distance_to_next_km: metrics.distanceToNextKm,
    eta_minutes: metrics.etaMinutes,
    updated_at: new Date().toISOString(),
  };

  if (lat && lng) {
    updates.runner_lat = lat;
    updates.runner_lng = lng;
    updates.last_location_at = new Date().toISOString();

    await supabase.from("gps_records").insert({ user_id: user.id, lat, lng });
  }

  if (requestedPhase && !current?.[timestampField]) {
    updates[timestampField] = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("task_tracking")
    .upsert(updates, { onConflict: "errand_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (requestedPhase) {
    await supabase.from("notifications").insert({
      user_id: errand.customer_id,
      title: trackingNotificationTitle(requestedPhase),
      body: trackingNotificationBody(requestedPhase, data.eta_minutes),
      related_errand_id: errand.id,
    });
  }

  return NextResponse.json(data);
}

function calculateTrackingMetrics(
  errand: Record<string, unknown>,
  phase: TaskTrackingPhase,
  lat: number | null,
  lng: number | null,
) {
  const destination =
    phase === "heading_to_pickup" || phase === "accepted"
      ? { lat: Number(errand.pickup_lat), lng: Number(errand.pickup_lng) }
      : { lat: Number(errand.dropoff_lat ?? errand.pickup_lat), lng: Number(errand.dropoff_lng ?? errand.pickup_lng) };

  if (!lat || !lng || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) {
    return { distanceToNextKm: null, etaMinutes: null };
  }

  const distance = Math.round(haversineDistance(lat, lng, destination.lat, destination.lng) * 100) / 100;
  return { distanceToNextKm: distance, etaMinutes: estimateEtaMinutes(distance) };
}

function trackingNotificationTitle(phase: TaskTrackingPhase) {
  const titles: Record<TaskTrackingPhase, string> = {
    accepted: "Task accepted",
    heading_to_pickup: "Runner is heading to pickup",
    picked_up: "Item picked up",
    en_route_delivery: "Runner is on the way to you",
    delivered: "Delivered",
  };
  return titles[phase];
}

function trackingNotificationBody(phase: TaskTrackingPhase, eta: number | null) {
  const etaText = eta ? ` ETA: ${eta} min.` : "";
  const bodies: Record<TaskTrackingPhase, string> = {
    accepted: "Your runner accepted the task and tracking has started.",
    heading_to_pickup: `Your runner is heading to the pickup location.${etaText}`,
    picked_up: "Your runner has picked up the item.",
    en_route_delivery: `Your runner is heading to the delivery location.${etaText}`,
    delivered: "Your task has been delivered.",
  };
  return bodies[phase];
}
