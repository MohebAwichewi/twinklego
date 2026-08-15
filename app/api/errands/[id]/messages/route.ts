import { NextResponse } from "next/server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { createServerSupabase } from "@/lib/supabase-server";

const messageStatuses = ["accepted", "in_progress", "awaiting_confirmation", "payout_pending", "completed", "disputed"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await taskContext(id);
  if (!context.ok) return context.response;

  const { data, error } = await context.admin
    .from("task_messages")
    .select("id, errand_id, sender_id, body, created_at, sender:sender_id(id, full_name, avatar_url)")
    .eq("errand_id", Number(id))
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await taskContext(id);
  if (!context.ok) return context.response;
  if (!messageStatuses.filter(status => status !== "completed").includes(context.errand.status)) {
    return NextResponse.json({ error: "Messages are available only while a paid task is active." }, { status: 409 });
  }

  const payload = await request.json().catch(() => ({}));
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 1000) return NextResponse.json({ error: "Message must be between 1 and 1000 characters." }, { status: 400 });

  const { data, error } = await context.admin
    .from("task_messages")
    .insert({ errand_id: Number(id), sender_id: context.userId, body })
    .select("id, errand_id, sender_id, body, created_at, sender:sender_id(id, full_name, avatar_url)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipientId = context.errand.customer_id === context.userId
    ? context.errand.assigned_runner_id
    : context.errand.customer_id;
  if (recipientId) {
    await context.admin.from("notifications").insert({
      user_id: recipientId,
      title: "New task message",
      body: body.length > 90 ? `${body.slice(0, 87)}...` : body,
      related_errand_id: Number(id),
    });
  }

  return NextResponse.json(data);
}

async function taskContext(id: string) {
  const errandId = Number(id);
  if (!Number.isInteger(errandId) || errandId <= 0) {
    return { ok: false as const, response: NextResponse.json({ error: "Invalid errand." }, { status: 400 }) };
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = privilegedAdminClient();
  if (!admin) return { ok: false as const, response: NextResponse.json({ error: "Server configuration is incomplete." }, { status: 503 }) };
  const { data: errand } = await admin.from("errands").select("id, customer_id, assigned_runner_id, status").eq("id", errandId).single();
  if (!errand || (errand.customer_id !== user.id && errand.assigned_runner_id !== user.id) || !messageStatuses.includes(errand.status)) {
    return { ok: false as const, response: NextResponse.json({ error: "Task conversation not found." }, { status: 404 }) };
  }

  return { ok: true as const, admin, errand, userId: user.id };
}
