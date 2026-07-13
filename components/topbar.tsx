"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, User, Sparkles, House, ClipboardList, Wallet, Users, ShieldCheck, Menu, X, LogOut, Shield } from "lucide-react";
import { Notification, Profile } from "@/lib/types";
import Link from "next/link";
import AvailabilityToggle from "./availability-toggle";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

const navItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/errands", label: "Requests", icon: ClipboardList },
  { href: "/runners", label: "Runners", icon: Users },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Trust & profile", icon: ShieldCheck },
];

export default function Topbar({ profile }: { profile: Profile | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const supabase = createClient();

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifications(data.slice(0, 20));
    }).catch(() => {});
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ mark_all_read: true }) });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <header className="topbar">
      <Link href="/dashboard" className="app-brand" aria-label="TwinkleGo home">
        <span><Sparkles size={18} /></span><b>Twinkle</b><strong>Go</strong>
      </Link>

      <nav className={`app-nav ${menuOpen ? "app-nav-open" : ""}`} aria-label="App navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setMenuOpen(false)}>
              <Icon size={17} /><span>{label}</span>
            </Link>
          );
        })}
        {profile?.is_admin ? <Link href="/admin" className={pathname.startsWith("/admin") ? "active" : ""} onClick={() => setMenuOpen(false)}><Shield size={17} /><span>Admin console</span></Link> : null}
      </nav>

      <div className="topbar-right">
        {(profile?.role === "runner" || profile?.role === "both") && <AvailabilityToggle />}

        <div className="notif-wrap" ref={panelRef}>
          <button className="topbar-icon-btn" onClick={() => setShowPanel(!showPanel)}>
            <Bell size={19} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>

          {showPanel && (
            <div className="notif-panel">
              <div className="notif-head">
                <strong>Notifications</strong>
                {unread > 0 && <button onClick={markAllRead} className="notif-mark-read">Mark all read</button>}
              </div>
              <div className="notif-list">
                {notifications.length === 0 && <p className="notif-empty">No notifications yet</p>}
                {notifications.map(n => (
                  <Link
                    key={n.id}
                    href={n.related_errand_id ? `/errands/${n.related_errand_id}` : "/dashboard"}
                    className={`notif-item ${n.is_read ? "" : "unread"}`}
                    onClick={() => setShowPanel(false)}
                  >
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                    <time>{new Date(n.created_at).toLocaleDateString()}</time>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link href="/profile" className="topbar-profile">
          <span className="topbar-avatar">{initials || <User size={18} />}</span>
          <span>{profile?.full_name?.split(" ")[0] || "Profile"}</span>
        </Link>
        <button className="topbar-logout" onClick={handleLogout} aria-label="Log out" title="Log out">
          <LogOut size={17} />
        </button>
        <button className="app-menu-button" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
