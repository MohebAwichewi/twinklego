import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { errand_id, reviewee_id, rating, comment } = await request.json();
  if (!errand_id || !reviewee_id || !rating) {
    return NextResponse.json({ error: "errand_id, reviewee_id, and rating are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({ errand_id, reviewer_id: user.id, reviewee_id, rating, comment })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "You already reviewed this errand" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
