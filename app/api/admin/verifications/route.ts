import { privilegedAdminClient, recordAdminAction, requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { data, error } = await admin
    .from("verifications")
    .select("*, user:profiles!verifications_user_id_fkey(id, full_name, phone)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = await Promise.all((data ?? []).map(async item => {
    if (!item.id_image_url) return { ...item, document_url: null };
    const path = storagePath(item.id_image_url);
    const { data: signed } = await admin.storage.from("verifications").createSignedUrl(path, 600);
    return { ...item, document_url: signed?.signedUrl ?? null };
  }));
  return NextResponse.json(items);
}

export async function PATCH(request: Request) {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { id, status, reviewer_notes } = await request.json();
  if (!id || !new Set(["approved", "rejected"]).has(status)) return NextResponse.json({ error: "Verification and valid decision required." }, { status: 400 });

  const { data, error } = await admin.from("verifications").update({
    status,
    reviewer_notes: typeof reviewer_notes === "string" ? reviewer_notes.trim() || null : null,
    reviewed_by: context.user.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("profiles").update({ is_verified: status === "approved", updated_at: new Date().toISOString() }).eq("id", data.user_id);
  await admin.from("notifications").insert({
    user_id: data.user_id,
    title: status === "approved" ? "Identity verified" : "Verification needs attention",
    body: status === "approved" ? "Your identity has been approved. You can now post and accept tasks." : reviewer_notes || "Your verification was not approved. Review your documents and submit again.",
  });
  await recordAdminAction(context.user.id, `verification_${status}`, "verification", id, { user_id: data.user_id, reviewer_notes: reviewer_notes || null });
  return NextResponse.json(data);
}

function storagePath(value: string) {
  const marker = "/verifications/";
  return value.includes(marker) ? value.split(marker).pop()! : value;
}
