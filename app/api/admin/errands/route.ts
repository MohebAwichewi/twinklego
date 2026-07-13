import { privilegedAdminClient, recordAdminAction, requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { data, error } = await admin
    .from("errands")
    .select("*, customer:customer_id(id, full_name), assigned_runner:assigned_runner_id(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { id, action } = await request.json();
  if (!id || action !== "cancel") return NextResponse.json({ error: "Supported action: cancel." }, { status: 400 });
  const { data: existing } = await admin.from("errands").select("status").eq("id", id).single();
  if (!existing || ["completed", "cancelled"].includes(existing.status)) return NextResponse.json({ error: "This task can no longer be cancelled." }, { status: 409 });

  const { data, error } = await admin.from("errands").update({ status: "cancelled" }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAdminAction(context.user.id, "errand_cancelled", "errand", id);
  return NextResponse.json(data);
}
