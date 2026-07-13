import { privilegedAdminClient, recordAdminAction, requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { data, error } = await admin.from("disputes")
    .select("*, errand:errand_id(title, status, customer_id, assigned_runner_id), raised_by_profile:raised_by(full_name)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { id, resolution, status } = await request.json();
  if (!id || !new Set(["investigating", "resolved"]).has(status)) return NextResponse.json({ error: "Dispute and valid status required." }, { status: 400 });
  if (status === "resolved" && (typeof resolution !== "string" || resolution.trim().length < 5)) return NextResponse.json({ error: "Add clear resolution notes." }, { status: 400 });

  const updates: Record<string, unknown> = { status };
  if (resolution) updates.resolution = resolution.trim();
  if (status === "resolved") { updates.resolved_by = context.user.id; updates.resolved_at = new Date().toISOString(); }

  const { data, error } = await admin.from("disputes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (status === "resolved") {
    await admin.from("notifications").insert({ user_id: data.raised_by, title: "Dispute resolved", body: resolution.trim(), related_errand_id: data.errand_id });
  }
  await recordAdminAction(context.user.id, `dispute_${status}`, "dispute", id, { resolution: resolution || null });
  return NextResponse.json(data);
}
