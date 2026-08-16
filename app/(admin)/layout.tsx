import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin-sidebar";
import RouteMotion from "@/components/route-motion";
import TwinkleStickers from "@/components/twinkle-stickers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, is_admin, is_super_admin, is_suspended").eq("id", user.id).single();
  if (!profile?.is_admin || profile.is_suspended) redirect("/dashboard");

  return (
    <div className="dash-shell admin-shell">
      <TwinkleStickers variant="admin" />
      <AdminSidebar isSuperAdmin={profile.is_super_admin} displayName={profile.full_name || "TwinkleGo Admin"} />
      <div className="dash-main">
        <div className="admin-mobile-brand">TwinkleGo <strong>Admin</strong></div>
        <div className="dash-content"><RouteMotion>{children}</RouteMotion></div>
      </div>
    </div>
  );
}
