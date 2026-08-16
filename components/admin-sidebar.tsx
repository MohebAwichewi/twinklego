"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/errands", label: "All errands", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/security", label: "Password & security", icon: KeyRound },
];

export default function AdminSidebar({
  isSuperAdmin,
  displayName,
}: {
  isSuperAdmin: boolean;
  displayName: string;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside className="sidebar admin-sidebar">
      <div className="sidebar-brand">
        <Link href="/admin" className="logo" aria-label="TwinkleGo admin overview">
          <span className="logo-mark"><Sparkles size={16} strokeWidth={2.4} /></span>
          <span>Twinkle<strong>Go</strong></span>
        </Link>
        <span className="super-admin-label">{isSuperAdmin ? "Super admin" : "Admin"}</span>
      </div>

      <div className="admin-identity">
        <span>{initials(displayName)}</span>
        <div><small>Signed in as</small><strong>{displayName}</strong></div>
      </div>

      <nav className="sidebar-nav" aria-label="Admin navigation">
        {adminNav.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} className={`sidebar-link ${active ? "active" : ""}`}><Icon size={18} /><span>{label}</span></Link>;
        })}
      </nav>

      <div className="sidebar-foot">
        {!isSuperAdmin ? <Link href="/dashboard" className="sidebar-link"><ArrowLeft size={18} /><span>Back to TwinkleGo</span></Link> : null}
        <button type="button" className="sidebar-link admin-logout" onClick={handleLogout}><LogOut size={18} /><span>Log out</span></button>
      </div>
    </aside>
  );
}

function initials(name: string) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "TG";
}
