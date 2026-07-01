import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, interest } = await request.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Waitlist setup is not connected yet." },
      { status: 503 },
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { error } = await supabase
    .from("waitlist")
    .insert({ email, interest: interest ?? "help" });

  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "You are already on the waitlist." : "Could not join right now." },
      { status: duplicate ? 409 : 500 },
    );
  }

  return NextResponse.json({ success: true });
}
