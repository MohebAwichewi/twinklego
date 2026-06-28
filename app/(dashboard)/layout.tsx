import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <Topbar profile={profile} />
        <div className="dash-content">
          {children}
        </div>
      </div>
    </div>
  );
}
