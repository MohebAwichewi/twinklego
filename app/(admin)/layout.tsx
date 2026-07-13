import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShieldCheck, AlertTriangle, Users, Sparkles, ArrowLeft, ClipboardList, ScrollText,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/errands", label: "All Errands", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin, is_super_admin, is_suspended").eq("id", user.id).single();
  if (!profile?.is_admin || profile.is_suspended) redirect("/dashboard");

  return (
    <div className="dash-shell">
      <aside className="sidebar admin-sidebar">
        <div className="sidebar-brand">
          <Link href="/admin" className="logo">
            <span className="logo-mark"><Sparkles size={16} strokeWidth={2.4} /></span>
            <span>Admin</span>
          </Link>
          {profile.is_super_admin ? <span className="super-admin-label">Super admin</span> : null}
        </div>
        <nav className="sidebar-nav">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="sidebar-link"><Icon size={18} /><span>{label}</span></Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link href="/dashboard" className="sidebar-link"><ArrowLeft size={18} /><span>Back to app</span></Link>
        </div>
      </aside>
      <div className="dash-main">
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
