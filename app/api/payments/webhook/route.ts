import { NextResponse } from "next/server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { applyPaystackRefundEvent, applyPaystackTransferEvent, confirmPaystackCharge } from "@/lib/payment-workflow";
import { verifyPaystackSignature } from "@/lib/paystack";

interface PaystackEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paid_at?: string;
    transfer_code?: string;
    reason?: string;
    transaction_reference?: string;
    refund_reference?: string;
    id?: number;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 503 });

  const payload = JSON.parse(rawBody) as PaystackEvent;
  try {
    if (payload.event === "charge.success") await confirmPaystackCharge(admin, payload.data);
    if (["transfer.success", "transfer.failed", "transfer.reversed"].includes(payload.event)) {
      await applyPaystackTransferEvent(admin, payload.data);
    }
    if (["refund.pending", "refund.processing", "refund.needs-attention", "refund.processed", "refund.failed"].includes(payload.event)) {
      await applyPaystackRefundEvent(admin, payload.data);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }
}
