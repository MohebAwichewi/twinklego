import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, amount } = await request.json();
  const numericAmount = Number(amount);

  if (!["deposit", "withdrawal"].includes(type) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "Enter a valid deposit or withdrawal amount." }, { status: 400 });
  }

  const { error } = await supabase.rpc("adjust_wallet_balance", {
    transaction_type: type,
    transaction_amount: numericAmount,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (walletError) return NextResponse.json({ error: walletError.message }, { status: 500 });
  return NextResponse.json(wallet);
}
