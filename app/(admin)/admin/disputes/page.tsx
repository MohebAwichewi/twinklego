"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Check } from "lucide-react";

interface DisputeItem {
  id: number;
  errand_id: number;
  raised_by: string;
  reason: string;
  category: string;
  status: string;
  resolution: string | null;
  created_at: string;
  errand?: { title: string; status: string };
  raised_by_profile?: { full_name: string | null };
}

export default function AdminDisputes() {
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    fetch("/api/admin/disputes").then(r => r.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  async function handleResolve(id: number) {
    setResolving(id);
    await fetch("/api/admin/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "resolved", resolution }),
    });
    setItems(prev => prev.map(d => d.id === id ? { ...d, status: "resolved", resolution } : d));
    setResolving(null);
    setResolution("");
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1><AlertTriangle size={24} /> Disputes</h1><p>Review and resolve user disputes</p></div></div>

      {items.length === 0 ? (
        <div className="empty-state"><AlertTriangle size={36} /><p>No disputes</p></div>
      ) : (
        <div className="admin-table">
          {items.map(d => (
            <div key={d.id} className="admin-row dispute-row">
              <div className="admin-row-main">
                <div>
                  <strong>{d.errand?.title || `Errand #${d.errand_id}`}</strong>
                  <small>Raised by: {d.raised_by_profile?.full_name || "Unknown"}</small>
                  <small>Category: {d.category.replace("_", " ")}</small>
                  <p className="dispute-reason">{d.reason}</p>
                </div>
              </div>
              <span className={`status-badge ${d.status === "resolved" ? "completed" : "posted"}`}>{d.status}</span>
              {d.status !== "resolved" && (
                <div className="resolve-form">
                  <input placeholder="Resolution notes..." value={resolving === d.id ? resolution : ""} onChange={e => { setResolving(d.id); setResolution(e.target.value); }} />
                  <button className="icon-btn success" onClick={() => handleResolve(d.id)} disabled={!resolution && resolving === d.id}>
                    <Check size={16} /> Resolve
                  </button>
                </div>
              )}
              {d.resolution && <small className="resolution-text">Resolved: {d.resolution}</small>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
