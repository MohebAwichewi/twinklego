import { createServerSupabase } from "@/lib/supabase-server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

const errandSelect = "*, customer:customer_id(id, full_name, avatar_url, rating, rating_count, is_verified), assigned_runner:assigned_runner_id(id, full_name, avatar_url, rating, rating_count, is_verified), tracking:task_tracking(*)";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error: accessError } = await supabase
    .from("errands")
    .select("id")
    .eq("id", id)
    .single();
  if (accessError) return NextResponse.json({ error: "Errand not found" }, { status: 404 });

  const dataClient = privilegedAdminClient() ?? supabase;

  const { data, error } = await dataClient
    .from("errands")
    .select(errandSelect)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dataClient = privilegedAdminClient() ?? supabase;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const { data: current, error: currentError } = await supabase
    .from("errands")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: currentError?.message || "Errand not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_verified")
    .eq("id", user.id)
    .single();

  if (body.status === "accepted") {
    const canRun = profile?.is_verified && ["runner", "both"].includes(profile.role);
    if (!canRun) {
      return NextResponse.json(
        { error: "Only verified runners can accept errands." },
        { status: 403 },
      );
    }
    if (current.customer_id === user.id) {
      return NextResponse.json({ error: "You cannot accept your own errand." }, { status: 403 });
    }
    updates.status = "accepted";
    updates.assigned_runner_id = user.id;
  } else if (body.status === "in_progress") {
    if (current.assigned_runner_id !== user.id) {
      return NextResponse.json({ error: "Only the assigned runner can start this errand." }, { status: 403 });
    }
    updates.status = "in_progress";
  } else if (body.status === "completed") {
    if (current.assigned_runner_id !== user.id) {
      return NextResponse.json({ error: "Only the assigned runner can complete this errand." }, { status: 403 });
    }

    const { data: completed, error } = await supabase.rpc("complete_errand", {
      target_errand_id: Number(id),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = await dataClient
      .from("errands")
      .select(errandSelect)
      .eq("id", id)
      .single();

    await dataClient.from("task_tracking").upsert({
      errand_id: Number(id),
      phase: "delivered",
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      eta_minutes: 0,
      distance_to_next_km: 0,
    }, { onConflict: "errand_id" });

    if (data?.customer_id !== user.id) {
      await dataClient.from("notifications").insert({
        user_id: data.customer_id,
        title: "Errand completed",
        body: `"${data.title}" has been completed and payment was released.`,
        related_errand_id: data.id,
      });
    }

    return NextResponse.json(data ?? completed);
  } else if (body.status === "cancelled") {
    if (current.customer_id !== user.id) {
      return NextResponse.json({ error: "Only the customer can cancel this errand." }, { status: 403 });
    }
    updates.status = "cancelled";
  } else if (body.status === "disputed") {
    const isParty = current.customer_id === user.id || current.assigned_runner_id === user.id;
    if (!isParty) return NextResponse.json({ error: "Only errand parties can dispute this errand." }, { status: 403 });
    updates.status = "disputed";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No supported update was provided." }, { status: 400 });
  }

  const { data, error } = await dataClient
    .from("errands")
    .update(updates)
    .eq("id", id)
    .select(errandSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create notification for status changes
  if (data && body.status) {
    if (body.status === "accepted") {
      await dataClient.from("task_tracking").upsert({
        errand_id: data.id,
        phase: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "errand_id" });
    }

    if (body.status === "in_progress") {
      await dataClient.from("task_tracking").upsert({
        errand_id: data.id,
        phase: "heading_to_pickup",
        heading_to_pickup_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "errand_id" });
    }

    const notifyUserId = body.status === "accepted" || body.status === "in_progress"
      ? data.customer_id
      : body.status === "completed"
        ? data.customer_id
        : data.assigned_runner_id;

    if (notifyUserId && notifyUserId !== user.id) {
      await dataClient.from("notifications").insert({
        user_id: notifyUserId,
        title: `Errand ${body.status.replace("_", " ")}`,
        body: `"${data.title}" has been ${body.status.replace("_", " ")}.`,
        related_errand_id: data.id,
      });
    }

  }

  return NextResponse.json(data);
}
