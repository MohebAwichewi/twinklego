import { privilegedAdminClient, requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const { data, error } = await admin
    .from("admin_audit_logs")
    .select("*, actor:actor_id(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
