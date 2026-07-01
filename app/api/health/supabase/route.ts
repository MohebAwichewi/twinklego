import { getSupabaseConfigSummary, getSupabasePublicKey } from "@/lib/supabase-config";
import { NextResponse } from "next/server";

export async function GET() {
  const config = getSupabaseConfigSummary();

  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: {
        apikey: getSupabasePublicKey(),
      },
      cache: "no-store",
    });

    return NextResponse.json({
      ...config,
      authSettingsReachable: response.ok,
      authSettingsStatus: response.status,
    });
  } catch (error) {
    return NextResponse.json({
      ...config,
      authSettingsReachable: false,
      error: error instanceof Error ? error.message : "Unknown Supabase health check error",
    });
  }
}
