import { NextResponse } from "next/server";
import { privilegedAdminClient, recordAdminAction, requireAdmin } from "@/lib/admin-auth";
import { initiateCustomerRefund, initiateRunnerPayout } from "@/lib/payment-workflow";
import { isPaystackConfigured, paystackMode } from "@/lib/paystack";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const [paymentResult, payoutResult] = await Promise.all([
    admin.from("errand_payments")
      .select("*, errand:errands!errand_payments_errand_id_fkey(id, title, status), customer:profiles!errand_payments_customer_id_fkey(id, full_name)")
      .order("created_at", { ascending: false }).limit(300),
    admin.from("payouts")
      .select("*, errand:errands!payouts_errand_id_fkey(id, title, status), runner:profiles!payouts_runner_id_fkey(id, full_name)")
      .order("created_at", { ascending: false }).limit(300),
  ]);
  if (paymentResult.error) return NextResponse.json({ error: paymentResult.error.message }, { status: 500 });
  if (payoutResult.error) return NextResponse.json({ error: payoutResult.error.message }, { status: 500 });
  return NextResponse.json({
    provider: { configured: isPaystackConfigured(), mode: paystackMode() },
    payments: paymentResult.data ?? [],
    payouts: payoutResult.data ?? [],
    can_manage_money: Boolean(context.profile.is_super_admin),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin(true);
  if (!context.ok) return context.response;
  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure admin service is not configured." }, { status: 503 });

  const body = await request.json();
  if (body.action === "retry_payout") {
    const payoutId = Number(body.payout_id);
    const { data: payout } = await admin.from("payouts").select("*").eq("id", payoutId).single();
    if (!payout || !["failed", "reversed"].includes(payout.status)) return NextResponse.json({ error: "Only failed or reversed payouts can be retried." }, { status: 409 });
    try {
      const updated = await initiateRunnerPayout(admin, Number(payout.errand_id), payout.runner_id);
      await recordAdminAction(context.user.id, "payout_retried", "payout", payoutId, { errand_id: payout.errand_id });
      return NextResponse.json(updated);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Payout retry failed." }, { status: 502 });
    }
  }

  if (body.action === "refund_payment") {
    const paymentId = Number(body.payment_id);
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!paymentId || note.length < 5) return NextResponse.json({ error: "Add a clear refund reason." }, { status: 400 });
    try {
      const refund = await initiateCustomerRefund(admin, paymentId, note);
      await recordAdminAction(context.user.id, "payment_refund_started", "payment", paymentId, { note });
      return NextResponse.json(refund);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Refund could not be started." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Supported actions: retry_payout or refund_payment." }, { status: 400 });
}
