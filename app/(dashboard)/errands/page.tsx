"use client";

import { useEffect, useState } from "react";
import { Errand } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import { ListChecks, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";

const tabs = ["all", "posted", "accepted", "in_progress", "completed", "cancelled"] as const;

export default function ErrandsPage() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof tabs[number]>("all");

  useEffect(() => {
    fetch("/api/errands").then(r => r.json()).then(data => {
      setErrands(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  const filtered = tab === "all" ? errands : errands.filter(e => e.status === tab);

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1>My Errands</h1>
          <p>Track and manage all your errands</p>
        </div>
        <Link href="/errands/new" className="button"><PlusCircle size={16} /> Post New</Link>
      </div>

      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.replace("_", " ")}
            {t !== "all" && <span className="tab-count">{errands.filter(e => e.status === t).length}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ListChecks size={36} />
          <p>No errands found</p>
          <Link href="/errands/new" className="button button-small">Post your first errand</Link>
        </div>
      ) : (
        <div className="errand-list">
          {filtered.map(e => (
            <Link key={e.id} href={`/errands/${e.id}`} className="errand-row">
              <span className={`errand-status-dot ${e.status}`} />
              <div className="errand-row-main">
                <strong>{e.title}</strong>
                <small>{e.category.replace("_", " ")} · {formatNGN(e.price)}{e.distance_km ? ` · ${e.distance_km} km` : ""}</small>
              </div>
              <div className="errand-row-side">
                <span className={`status-badge ${e.status}`}>{e.status.replace("_", " ")}</span>
                <time>{new Date(e.created_at).toLocaleDateString()}</time>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
