"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, ListChecks, ShieldCheck, AlertTriangle, Radio, CircleCheck, Banknote } from "lucide-react";
import { formatNGN } from "@/lib/geo";

export default function AdminOverview() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  const cards = [
    { label: "Total Users", value: stats.total_users ?? 0, icon: Users, color: "blue" },
    { label: "Total Errands", value: stats.total_errands ?? 0, icon: ListChecks, color: "teal" },
    { label: "Active Errands", value: stats.active_errands ?? 0, icon: Radio, color: "blue" },
    { label: "Completed", value: stats.completed_errands ?? 0, icon: CircleCheck, color: "teal" },
    { label: "Pending Verifications", value: stats.pending_verifications ?? 0, icon: ShieldCheck, color: "gold" },
    { label: "Open Disputes", value: stats.open_disputes ?? 0, icon: AlertTriangle, color: "coral" },
    { label: "Available Runners", value: stats.available_runners ?? 0, icon: Users, color: "blue" },
    { label: "Completed Task Volume", value: formatNGN(stats.gross_volume ?? 0), icon: Banknote, color: "gold" },
  ];

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1>Admin Overview</h1><p>Platform at a glance</p></div></div>
      <div className="stats-grid">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <span className={`stat-icon ${color}`}><Icon size={20} /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </div>
        ))}
      </div>
    </div>
  );
}
