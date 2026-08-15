import { createServerSupabase } from "@/lib/supabase-server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { initiateRunnerPayout } from "@/lib/payment-workflow";
import { NextResponse } from "next/server";

const errandSelect = "*, customer:customer_id(id, full_name, avatar_url, rating, rating_count, is_verified), assigned_runner:assigned_runner_id(id, full_name, avatar_url, rating, rating_count, is_verified), tracking:task_tracking(*), payment:errand_payments(status, amount, currency, paid_at), payout:payouts(status, amount, paid_at)";

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
    if (current.status !== "posted" || current.assigned_runner_id) {
      return NextResponse.json({ error: "This errand is no longer available." }, { status: 409 });
    }
    const [{ data: payment }, { data: payoutAccount }] = await Promise.all([
      dataClient.from("errand_payments").select("id").eq("errand_id", Number(id)).eq("status", "paid").maybeSingle(),
      dataClient.from("runner_payout_accounts").select("id").eq("user_id", user.id).eq("is_verified", true).maybeSingle(),
    ]);
    if (!payment) return NextResponse.json({ error: "This task is not backed by a confirmed payment." }, { status: 409 });
    if (!payoutAccount) return NextResponse.json({ error: "Add a verified payout account in Profile before accepting tasks." }, { status: 403 });
    updates.status = "accepted";
    updates.assigned_runner_id = user.id;
  } else if (body.status === "in_progress") {
    if (current.assigned_runner_id !== user.id || current.status !== "accepted") {
      return NextResponse.json({ error: "Only the assigned runner can start this errand." }, { status: 403 });
    }
    updates.status = "in_progress";
  } else if (body.status === "awaiting_confirmation") {
    if (current.assigned_runner_id !== user.id || current.status !== "in_progress") {
      return NextResponse.json({ error: "Only the assigned runner can mark an active task delivered." }, { status: 403 });
    }
    updates.status = "awaiting_confirmation";
  } else if (body.status === "completed") {
    if (current.customer_id !== user.id || current.status !== "awaiting_confirmation" || !current.assigned_runner_id) {
      return NextResponse.json({ error: "Only the customer can confirm a delivered task." }, { status: 403 });
    }
    const { error: pendingError } = await dataClient.from("errands").update({ status: "payout_pending" }).eq("id", Number(id)).eq("status", "awaiting_confirmation");
    if (pendingError) return NextResponse.json({ error: pendingError.message }, { status: 500 });
    try {
      await initiateRunnerPayout(dataClient, Number(id), current.assigned_runner_id);
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : "Payout could not be started. TwinkleGo support has been notified.",
        payout_pending: true,
      }, { status: 502 });
    }
    const { data } = await dataClient
      .from("errands")
      .select(errandSelect)
      .eq("id", id)
      .single();
    return NextResponse.json(data);
  } else if (body.status === "cancelled") {
    if (current.customer_id !== user.id || !["awaiting_payment", "payment_failed"].includes(current.status)) {
      return NextResponse.json({ error: "Paid tasks require a refund or dispute review before cancellation." }, { status: 403 });
    }
    updates.status = "cancelled";
  } else if (body.status === "disputed") {
    const isParty = current.customer_id === user.id || current.assigned_runner_id === user.id;
    if (!isParty || !["posted", "accepted", "in_progress", "awaiting_confirmation", "payout_pending"].includes(current.status)) {
      return NextResponse.json({ error: "Only parties to a paid task can open a dispute." }, { status: 403 });
    }
    updates.status = "disputed";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No supported update was provided." }, { status: 400 });
  }

  let updateQuery = dataClient
    .from("errands")
    .update(updates)
    .eq("id", id);
  if (body.status === "accepted") updateQuery = updateQuery.eq("status", "posted").is("assigned_runner_id", null);

  const { data, error } = await updateQuery
    .select(errandSelect)
    .single();

  if (error) return NextResponse.json({ error: body.status === "accepted" ? "Another runner accepted this task first." : error.message }, { status: body.status === "accepted" ? 409 : 500 });

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

    if (body.status === "awaiting_confirmation") {
      await dataClient.from("task_tracking").upsert({
        errand_id: data.id,
        phase: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        eta_minutes: 0,
        distance_to_next_km: 0,
      }, { onConflict: "errand_id" });
    }

    const notifyUserId = ["accepted", "in_progress", "awaiting_confirmation"].includes(body.status)
      ? data.customer_id
      : data.assigned_runner_id || data.customer_id;

    if (notifyUserId && notifyUserId !== user.id) {
      await dataClient.from("notifications").insert({
        user_id: notifyUserId,
        title: body.status === "awaiting_confirmation" ? "Delivery awaiting confirmation" : `Errand ${body.status.replaceAll("_", " ")}`,
        body: body.status === "awaiting_confirmation" ? `Please confirm that "${data.title}" was completed so payout can begin.` : `"${data.title}" is now ${body.status.replaceAll("_", " ")}.`,
        related_errand_id: data.id,
      });
    }

  }

  return NextResponse.json(data);
}
