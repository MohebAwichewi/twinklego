import { NextResponse } from "next/server";
import { privilegedAdminClient } from "@/lib/admin-auth";
import { PaystackError, paystackRequest } from "@/lib/paystack";
import { createServerSupabase } from "@/lib/supabase-server";

interface ResolveAccountResponse {
  account_number: string;
  account_name: string;
}
interface RecipientResponse {
  recipient_code: string;
  name: string;
  details?: { bank_name?: string };
}

interface Bank {
  name: string;
  code: string;
  active: boolean;
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 503 });
  const { data } = await admin
    .from("runner_payout_accounts")
    .select("id, provider, account_name, bank_name, account_last4, is_verified, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = privilegedAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const accountNumber = typeof body.account_number === "string" ? body.account_number.replace(/\D/g, "") : "";
  const bankCode = typeof body.bank_code === "string" ? body.bank_code.trim() : "";
  if (!/^\d{10}$/.test(accountNumber) || !/^\d{2,6}$/.test(bankCode)) {
    return NextResponse.json({ error: "Enter a valid Nigerian bank and 10-digit account number." }, { status: 400 });
  }

  const { data: profile } = await admin.from("profiles").select("full_name, role, is_verified, is_suspended").eq("id", user.id).single();
  if (!profile?.is_verified || profile.is_suspended || !["runner", "both"].includes(profile.role)) {
    return NextResponse.json({ error: "Only verified runners can configure payouts." }, { status: 403 });
  }

  try {
    const [resolved, banks] = await Promise.all([
      paystackRequest<ResolveAccountResponse>(`/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`),
      paystackRequest<Bank[]>("/bank?country=nigeria&currency=NGN&perPage=100"),
    ]);
    const bank = banks.find(candidate => candidate.code === bankCode && candidate.active);
    if (!bank) return NextResponse.json({ error: "Choose a supported Nigerian bank." }, { status: 400 });

    const recipient = await paystackRequest<RecipientResponse>("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name: resolved.account_name || profile.full_name || "TwinkleGo Runner",
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      }),
    });

    const { data, error } = await admin
      .from("runner_payout_accounts")
      .upsert({
        user_id: user.id,
        provider: "paystack",
        recipient_code: recipient.recipient_code,
        account_name: resolved.account_name,
        bank_name: bank.name,
        account_last4: accountNumber.slice(-4),
        is_verified: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("id, provider, account_name, bank_name, account_last4, is_verified, created_at, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify this bank account." }, { status: error instanceof PaystackError ? error.status : 502 });
  }
}
