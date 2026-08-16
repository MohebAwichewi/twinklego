import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Topbar from "@/components/topbar";
import RouteMotion from "@/components/route-motion";
import TwinkleStickers from "@/components/twinkle-stickers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.is_super_admin) redirect("/admin");

  return (
    <div className="dash-shell">
      <TwinkleStickers />
      <div className="dash-main">
        <Topbar profile={profile} />
        <div className="dash-content">
          <RouteMotion>{children}</RouteMotion>
        </div>
      </div>
    </div>
  );
}
