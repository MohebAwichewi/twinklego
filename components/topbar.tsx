"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, User } from "lucide-react";
import { Notification, Profile } from "@/lib/types";
import Link from "next/link";
import AvailabilityToggle from "./availability-toggle";

export default function Topbar({ profile }: { profile: Profile | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-greeting">
          {greeting()}, <span>{profile?.full_name?.split(" ")[0] || "there"}</span>
        </h2>
      </div>
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

        <Link href="/profile" className="topbar-avatar">
          {initials || <User size={18} />}
        </Link>
      </div>
    </header>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
