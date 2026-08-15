import { NextResponse } from "next/server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { confirmPaystackCharge } from "@/lib/payment-workflow";
import { getSiteUrl, paystackRequest } from "@/lib/paystack";

interface VerifyResponse {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paid_at?: string;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference")?.trim();
  const fallback = new URL("/errands?payment=failed", getSiteUrl());
  if (!reference || reference.length > 100) return NextResponse.redirect(fallback);

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.redirect(fallback);

  try {
    const verified = await paystackRequest<VerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`);
    const result = await confirmPaystackCharge(admin, verified);
    return NextResponse.redirect(new URL(`/errands/${result.errandId}?payment=success`, getSiteUrl()));
  } catch {
    return NextResponse.redirect(fallback);
  }
}
