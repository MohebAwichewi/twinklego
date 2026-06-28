"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Check, X, Clock } from "lucide-react";

interface VerificationItem {
  id: number;
  user_id: string;
  id_type: string;
  id_number: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  user?: { full_name: string | null; phone: string | null };
}

export default function AdminVerifications() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/verifications").then(r => r.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  async function handleAction(id: number, status: "approved" | "rejected") {
    setProcessing(id);
    await fetch("/api/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setItems(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    setProcessing(null);
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1><ShieldCheck size={24} /> Verifications</h1><p>Review and approve identity verification requests</p></div></div>

      {items.length === 0 ? (
        <div className="empty-state"><ShieldCheck size={36} /><p>No verification requests</p></div>
      ) : (
        <div className="admin-table">
          {items.map(v => (
            <div key={v.id} className="admin-row">
              <div className="admin-row-main">
                <div className="avatar-sm">{v.user?.full_name?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <strong>{v.user?.full_name || "Unknown"}</strong>
                  <small>{v.id_type.replace("_", " ")} · {v.id_number}</small>
                  {v.user?.phone && <small>{v.user.phone}</small>}
                </div>
              </div>
              <span className={`status-badge ${v.status === "approved" ? "completed" : v.status === "rejected" ? "cancelled" : "posted"}`}>
                {v.status === "pending" && <Clock size={12} />} {v.status}
              </span>
              {v.status === "pending" && (
                <div className="admin-row-actions">
                  <button className="icon-btn success" onClick={() => handleAction(v.id, "approved")} disabled={processing === v.id}>
                    <Check size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => handleAction(v.id, "rejected")} disabled={processing === v.id}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
