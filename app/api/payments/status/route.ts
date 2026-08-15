import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { isPaystackConfigured, paystackMode } from "@/lib/paystack";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ configured: isPaystackConfigured(), mode: paystackMode() });
}
