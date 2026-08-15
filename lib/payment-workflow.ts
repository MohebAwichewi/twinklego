import "server-only";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { paystackRequest } from "@/lib/paystack";

interface PaystackCharge {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paid_at?: string;
}

interface PaystackTransfer {
  reference: string;
  transfer_code?: string;
  amount: number;
  status: string;
  reason?: string;
}

interface PaystackRefund {
  status: string;
  id?: number;
  refund_reference?: string | null;
  transaction_reference?: string;
  amount?: number | string;
  currency?: string;
  reason?: string;
}

export async function confirmPaystackCharge(admin: SupabaseClient, charge: PaystackCharge) {
  const { data: payment, error } = await admin
    .from("errand_payments")
    .select("*")
    .eq("provider_reference", charge.reference)
    .single();

  if (error || !payment) throw new Error("Payment reference was not found.");
  if (charge.status !== "success") throw new Error("Payment has not completed successfully.");
  if (charge.currency !== payment.currency || charge.amount !== Math.round(Number(payment.amount) * 100)) {
    throw new Error("Payment amount or currency does not match this errand.");
  }

  if (payment.status !== "paid") {
    const paidAt = charge.paid_at || new Date().toISOString();
    const { error: paymentError } = await admin
      .from("errand_payments")
      .update({ status: "paid", paid_at: paidAt, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (paymentError) throw new Error(paymentError.message);

    const { error: errandError } = await admin
      .from("errands")
      .update({ status: "posted" })
      .eq("id", payment.errand_id)
      .in("status", ["awaiting_payment", "payment_failed"]);
    if (errandError) throw new Error(errandError.message);

    await recordLedgerEntry(admin, payment.customer_id, "payment", -Number(payment.amount), `Paystack payment for errand #${payment.errand_id}`, payment.errand_id);
    await admin.from("notifications").insert({
      user_id: payment.customer_id,
      title: "Payment confirmed",
      body: "Your errand is now visible to verified runners.",
      related_errand_id: payment.errand_id,
    });
  }

  return { errandId: Number(payment.errand_id), status: "paid" as const };
}

export async function initiateRunnerPayout(admin: SupabaseClient, errandId: number, runnerId: string) {
  const [{ data: payment }, { data: payoutAccount }, { data: existingPayout }] = await Promise.all([
    admin.from("errand_payments").select("*").eq("errand_id", errandId).eq("status", "paid").single(),
    admin.from("runner_payout_accounts").select("*").eq("user_id", runnerId).eq("is_verified", true).single(),
    admin.from("payouts").select("*").eq("errand_id", errandId).maybeSingle(),
  ]);

  if (!payment) throw new Error("A confirmed customer payment is required before payout.");
  if (!payoutAccount) throw new Error("The runner must add a verified payout account before accepting tasks.");
  if (existingPayout && ["processing", "otp_required", "success"].includes(existingPayout.status)) return existingPayout;

  const reference = existingPayout && !["failed", "reversed"].includes(existingPayout.status)
    ? existingPayout.provider_reference
    : `twg_payout_${errandId}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const amount = Number(payment.runner_payout_amount);

  const { data: payout, error: payoutError } = await admin
    .from("payouts")
    .upsert({
      errand_id: errandId,
      runner_id: runnerId,
      provider: "paystack",
      provider_reference: reference,
      amount,
      currency: "NGN",
      status: "pending",
      failure_reason: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "errand_id" })
    .select()
    .single();
  if (payoutError || !payout) throw new Error(payoutError?.message || "Could not create the payout record.");

  try {
    const transfer = await paystackRequest<PaystackTransfer>("/transfer", {
      method: "POST",
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(amount * 100),
        recipient: payoutAccount.recipient_code,
        reference,
        currency: "NGN",
        reason: `TwinkleGo errand ${errandId} payout`,
      }),
    });

    const status = transfer.status === "otp" ? "otp_required" : transfer.status === "success" ? "success" : "processing";
    const paidAt = status === "success" ? new Date().toISOString() : null;
    const { data: updated, error: updateError } = await admin
      .from("payouts")
      .update({
        provider_transfer_code: transfer.transfer_code || null,
        status,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payout.id)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    if (status === "success") await completePayout(admin, updated);
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payout could not be initiated.";
    await admin.from("payouts").update({ status: "failed", failure_reason: message, updated_at: new Date().toISOString() }).eq("id", payout.id);
    throw error;
  }
}

export async function initiateCustomerRefund(admin: SupabaseClient, paymentId: number, note: string) {
  const { data: payment } = await admin.from("errand_payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.status !== "paid") throw new Error("Only a confirmed payment can be refunded.");
  if (["pending", "processing", "needs_attention", "processed"].includes(payment.refund_status)) {
    throw new Error("A refund already exists for this payment.");
  }

  const { data: payout } = await admin.from("payouts").select("status").eq("errand_id", payment.errand_id).maybeSingle();
  if (payout && ["processing", "otp_required", "success"].includes(payout.status)) {
    throw new Error("This payment cannot be automatically refunded because runner payout has already started.");
  }

  const refund = await paystackRequest<PaystackRefund>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: payment.provider_reference,
      amount: Math.round(Number(payment.amount) * 100),
      currency: payment.currency,
      customer_note: note,
      merchant_note: `TwinkleGo full refund for errand ${payment.errand_id}`,
    }),
  });

  const refundStatus = mapRefundStatus(refund.status);
  const refundReference = refund.refund_reference || (refund.id ? String(refund.id) : null);
  await admin.from("errand_payments").update({
    refund_status: refundStatus,
    refund_reference: refundReference,
    updated_at: new Date().toISOString(),
  }).eq("id", payment.id);
  await admin.from("errands").update({ status: "disputed" }).eq("id", payment.errand_id).neq("status", "completed");
  await admin.from("notifications").insert({
    user_id: payment.customer_id,
    title: "Refund started",
    body: "Paystack is processing your TwinkleGo task refund.",
    related_errand_id: payment.errand_id,
  });
  return { ...refund, status: refundStatus };
}

export async function applyPaystackRefundEvent(admin: SupabaseClient, refund: PaystackRefund) {
  const transactionReference = refund.transaction_reference;
  if (!transactionReference) return;
  const { data: payment } = await admin.from("errand_payments").select("*").eq("provider_reference", transactionReference).maybeSingle();
  if (!payment) return;

  const refundStatus = mapRefundStatus(refund.status);
  const processed = refundStatus === "processed";
  await admin.from("errand_payments").update({
    status: processed ? "refunded" : payment.status,
    refund_status: refundStatus,
    refund_reference: refund.refund_reference || payment.refund_reference,
    refunded_at: processed ? new Date().toISOString() : payment.refunded_at,
    updated_at: new Date().toISOString(),
  }).eq("id", payment.id);

  if (processed) {
    await admin.from("errands").update({ status: "cancelled" }).eq("id", payment.errand_id).neq("status", "completed");
    await recordLedgerEntry(admin, payment.customer_id, "refund", Number(payment.amount), `Paystack refund for errand #${payment.errand_id}`, payment.errand_id);
    await admin.from("notifications").insert({ user_id: payment.customer_id, title: "Refund processed", body: "Paystack has processed your TwinkleGo task refund.", related_errand_id: payment.errand_id });
  } else if (refundStatus === "failed" || refundStatus === "needs_attention") {
    await admin.from("notifications").insert({ user_id: payment.customer_id, title: "Refund needs attention", body: "Support is reviewing your Paystack refund.", related_errand_id: payment.errand_id });
  }
}

export async function applyPaystackTransferEvent(admin: SupabaseClient, transfer: PaystackTransfer) {
  const { data: payout } = await admin
    .from("payouts")
    .select("*")
    .eq("provider_reference", transfer.reference)
    .maybeSingle();
  if (!payout) return;

  const status = transfer.status === "success"
    ? "success"
    : transfer.status === "reversed"
      ? "reversed"
      : transfer.status === "failed"
        ? "failed"
        : "processing";
  const paidAt = status === "success" ? new Date().toISOString() : null;

  const { data: updated } = await admin
    .from("payouts")
    .update({
      status,
      provider_transfer_code: transfer.transfer_code || payout.provider_transfer_code,
      failure_reason: status === "failed" || status === "reversed" ? transfer.reason || `Transfer ${status}` : null,
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payout.id)
    .select()
    .single();

  if (status === "success" && updated) await completePayout(admin, updated);
  if (["failed", "reversed"].includes(status)) {
    await admin.from("notifications").insert({
      user_id: payout.runner_id,
      title: "Payout needs attention",
      body: "Your payout could not be completed. TwinkleGo support has been notified.",
      related_errand_id: payout.errand_id,
    });
  }
}

async function completePayout(admin: SupabaseClient, payout: Record<string, unknown>) {
  const errandId = Number(payout.errand_id);
  const runnerId = String(payout.runner_id);
  const amount = Number(payout.amount);

  await admin.from("errands").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", errandId);
  await recordLedgerEntry(admin, runnerId, "earning", amount, `Paystack payout for errand #${errandId}`, errandId);
  await admin.from("notifications").insert({
    user_id: runnerId,
    title: "Payout sent",
    body: `Your payout for errand #${errandId} has been processed.`,
    related_errand_id: errandId,
  });
}

async function recordLedgerEntry(
  admin: SupabaseClient,
  userId: string,
  type: "payment" | "earning" | "refund",
  amount: number,
  description: string,
  errandId: number,
) {
  const { data: existing } = await admin
    .from("transactions")
    .select("id")
    .eq("related_errand_id", errandId)
    .eq("type", type)
    .maybeSingle();
  if (existing) return;

  const { data: wallet } = await admin.from("wallets").select("id").eq("user_id", userId).single();
  if (!wallet) return;
  await admin.from("transactions").insert({ wallet_id: wallet.id, type, amount, description, related_errand_id: errandId });
}

function mapRefundStatus(status: string) {
  if (status === "processed") return "processed" as const;
  if (status === "processing") return "processing" as const;
  if (status === "needs-attention" || status === "needs_attention") return "needs_attention" as const;
  if (status === "failed") return "failed" as const;
  return "pending" as const;
}
