"use client";

import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { AdminAuditLog } from "@/lib/types";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit").then(async response => {
      const data = await response.json();
      if (!response.ok) setError(data.error || "Could not load audit history.");
      else setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1><ScrollText size={24} /> Admin Audit Log</h1><p>Permanent history of privileged platform actions</p></div></div>
      {error ? <div className="auth-error">{error}</div> : null}
      {loading ? <div className="dash-loading"><Loader2 size={28} className="spin" /></div> : logs.length === 0 ? (
        <div className="empty-state"><ScrollText size={36} /><p>No privileged actions recorded yet</p></div>
      ) : (
        <div className="admin-table">
          {logs.map(log => (
            <div key={log.id} className="admin-row audit-row">
              <span className="audit-action">{log.action.replaceAll("_", " ")}</span>
              <div className="admin-row-main"><div><strong>{log.actor?.full_name || "System"}</strong><small>{log.target_type}{log.target_id ? ` · ${log.target_id}` : ""}</small></div></div>
              <time>{new Date(log.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
