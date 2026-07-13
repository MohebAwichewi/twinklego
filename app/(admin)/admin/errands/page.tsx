"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, MapPin, XCircle } from "lucide-react";
import { Errand } from "@/lib/types";
import { formatNGN } from "@/lib/geo";

export default function AdminErrandsPage() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/errands");
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not load errands.");
    else setErrands(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    if (!window.confirm("Cancel this active errand?")) return;
    const response = await fetch("/api/admin/errands", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "cancel" }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not cancel errand.");
    else setErrands(current => current.map(errand => errand.id === id ? data : errand));
  }

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1><ClipboardList size={24} /> All Errands</h1><p>Live operational view of every task on the platform</p></div></div>
      {error ? <div className="auth-error">{error}</div> : null}
      {loading ? <div className="dash-loading"><Loader2 size={28} className="spin" /></div> : errands.length === 0 ? (
        <div className="empty-state"><ClipboardList size={36} /><p>No errands have been posted</p></div>
      ) : (
        <div className="admin-table">
          {errands.map(errand => (
            <div key={errand.id} className="admin-row admin-errand-row">
              <div className="admin-row-main"><div><Link href={`/errands/${errand.id}`}><strong>{errand.title}</strong></Link><small>{errand.customer?.full_name || "Customer"} → {errand.assigned_runner?.full_name || "Unassigned"}</small><small><MapPin size={11} /> {errand.pickup_address || "No pickup address"}</small></div></div>
              <strong>{formatNGN(Number(errand.price))}</strong>
              <span className={`status-badge ${errand.status}`}>{errand.status.replace("_", " ")}</span>
              {!new Set(["completed", "cancelled"]).has(errand.status) ? <button className="icon-btn danger" title="Cancel errand" onClick={() => cancel(errand.id)}><XCircle size={16} /></button> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
