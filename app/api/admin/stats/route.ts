import { privilegedAdminClient, requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const [users, errands, active, completed, verifications, disputes, runners, completedValues] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("errands").select("id", { count: "exact", head: true }),
    admin.from("errands").select("id", { count: "exact", head: true }).in("status", ["posted", "accepted", "in_progress"]),
    admin.from("errands").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_available", true).eq("is_verified", true),
    admin.from("errands").select("price").eq("status", "completed"),
  ]);

  const grossVolume = (completedValues.data ?? []).reduce((sum, item) => sum + Number(item.price || 0), 0);
  return NextResponse.json({
    total_users: users.count ?? 0,
    total_errands: errands.count ?? 0,
    active_errands: active.count ?? 0,
    completed_errands: completed.count ?? 0,
    pending_verifications: verifications.count ?? 0,
    open_disputes: disputes.count ?? 0,
    available_runners: runners.count ?? 0,
    gross_volume: grossVolume,
  });
}
