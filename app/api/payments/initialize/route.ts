import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { getSiteUrl, PaystackError, paystackRequest } from "@/lib/paystack";
import { createServerSupabase } from "@/lib/supabase-server";

interface InitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Secure payments are unavailable because the server key is missing." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const errandId = Number(body.errand_id);
  if (!Number.isInteger(errandId) || errandId <= 0) return NextResponse.json({ error: "A valid errand is required." }, { status: 400 });

  const [{ data: errand }, { data: profile }, { data: existingPayment }] = await Promise.all([
    admin.from("errands").select("id, customer_id, title, status, price, commission_amount, runner_earning").eq("id", errandId).single(),
    admin.from("profiles").select("is_verified, is_suspended").eq("id", user.id).single(),
    admin.from("errand_payments").select("*").eq("errand_id", errandId).maybeSingle(),
  ]);

  if (!errand || errand.customer_id !== user.id) return NextResponse.json({ error: "Errand not found." }, { status: 404 });
  if (!profile?.is_verified || profile.is_suspended) return NextResponse.json({ error: "Complete identity verification before paying for an errand." }, { status: 403 });
  if (existingPayment?.status === "paid") return NextResponse.json({ paid: true, errand_id: errandId });
  if (existingPayment?.status === "pending" && existingPayment.authorization_url) {
    return NextResponse.json({ authorization_url: existingPayment.authorization_url, reference: existingPayment.provider_reference, errand_id: errandId });
  }
  if (existingPayment && ["initializing", "pending"].includes(existingPayment.status)) {
    const ageMs = Date.now() - new Date(existingPayment.updated_at).getTime();
    if (ageMs < 90_000) return NextResponse.json({ error: "Secure checkout is still being prepared. Try again in a moment." }, { status: 409 });
    await admin.from("errand_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", existingPayment.id).in("status", ["initializing", "pending"]);
    existingPayment.status = "failed";
  }
  if (!["awaiting_payment", "payment_failed"].includes(errand.status)) return NextResponse.json({ error: "This errand is not awaiting payment." }, { status: 409 });

  const reference = `twg_${errandId}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const paymentRecord = {
    errand_id: errandId,
    customer_id: user.id,
    provider: "paystack",
    provider_reference: reference,
    amount: Number(errand.price),
    currency: "NGN",
    status: "initializing",
    commission_amount: Number(errand.commission_amount),
    runner_payout_amount: Number(errand.runner_earning),
    paid_at: null,
    authorization_url: null,
    access_code: null,
    updated_at: new Date().toISOString(),
  };

  const recordResult = existingPayment
    ? await admin.from("errand_payments").update(paymentRecord).eq("id", existingPayment.id).eq("status", "failed").select("id").single()
    : await admin.from("errand_payments").insert(paymentRecord).select("id").single();
  if (recordResult.error) return NextResponse.json({ error: "A checkout session already exists. Refresh the task and try again." }, { status: 409 });
  await admin.from("errands").update({ status: "awaiting_payment" }).eq("id", errandId);

  try {
    const initialized = await paystackRequest<InitializeResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(Number(errand.price) * 100),
        currency: "NGN",
        reference,
        callback_url: `${getSiteUrl()}/api/payments/callback`,
        metadata: {
          errand_id: errandId,
          customer_id: user.id,
          custom_fields: [{ display_name: "TwinkleGo task", variable_name: "task", value: errand.title }],
        },
      }),
    });

    await admin.from("errand_payments").update({
      status: "pending",
      authorization_url: initialized.authorization_url,
      access_code: initialized.access_code,
      updated_at: new Date().toISOString(),
    }).eq("errand_id", errandId).eq("provider_reference", reference);

    return NextResponse.json({
      authorization_url: initialized.authorization_url,
      reference: initialized.reference,
      errand_id: errandId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start secure checkout.";
    if (!(error instanceof PaystackError && error.status === 503)) {
      await Promise.all([
        admin.from("errand_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("errand_id", errandId),
        admin.from("errands").update({ status: "payment_failed" }).eq("id", errandId),
      ]);
    }
    return NextResponse.json({ error: message, errand_id: errandId }, { status: error instanceof PaystackError ? error.status : 502 });
  }
}
