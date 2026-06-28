"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, PlusCircle, ListChecks, Users,
  Wallet, User, LogOut, Sparkles, X, Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/errands/new", label: "Post Errand", icon: PlusCircle },
  { href: "/errands", label: "My Errands", icon: ListChecks },
  { href: "/runners", label: "Find Runners", icon: Users },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const content = (
    <>
      <div className="sidebar-brand">
        <Link href="/dashboard" className="logo">
          <span className="logo-mark"><Sparkles size={16} strokeWidth={2.4} /></span>
          <span>Twinkle</span><strong>Go</strong>
        </Link>
        <button className="sidebar-close" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <nav className="sidebar-nav">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`sidebar-link ${active ? "active" : ""}`} onClick={() => setOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <button className="sidebar-link logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setOpen(true)}><Menu size={22} /></button>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        {content}
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
