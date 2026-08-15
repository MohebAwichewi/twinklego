import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { PaystackError, paystackRequest } from "@/lib/paystack";

interface Bank {
  name: string;
  code: string;
  active: boolean;
  currency: string;
  type: string;
}
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const banks = await paystackRequest<Bank[]>("/bank?country=nigeria&currency=NGN&perPage=100");
    return NextResponse.json(banks.filter(bank => bank.active && bank.currency === "NGN").map(({ name, code }) => ({ name, code })));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load banks." }, { status: error instanceof PaystackError ? error.status : 502 });
  }
}
