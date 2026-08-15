"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Errand } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import { ListChecks, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";

const tabs = ["all", "awaiting_payment", "posted", "accepted", "in_progress", "awaiting_confirmation", "payout_pending", "completed", "cancelled"] as const;

export default function ErrandsPage() {
  const searchParams = useSearchParams();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const requestedTab = searchParams.get("tab");
  const initialTab = tabs.includes(requestedTab as typeof tabs[number]) ? requestedTab as typeof tabs[number] : "all";
  const [tab, setTab] = useState<typeof tabs[number]>(initialTab);

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
          <h1>Tasks & Opportunities</h1>
          <p>Manage your requests and find paid tasks open to verified runners.</p>
        </div>
        <Link href="/errands/new" className="button"><PlusCircle size={16} /> Request Help</Link>
      </div>

      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {tabLabel(t)}
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
                <span className={`status-badge ${e.status}`}>{tabLabel(e.status)}</span>
                <time>{new Date(e.created_at).toLocaleDateString()}</time>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function tabLabel(status: string) {
  return ({
    all: "All",
    awaiting_payment: "Needs payment",
    posted: "Paid & open",
    accepted: "Accepted",
    in_progress: "In progress",
    awaiting_confirmation: "Confirm delivery",
    payout_pending: "Payout processing",
    completed: "Completed",
    cancelled: "Cancelled",
  } as Record<string, string>)[status] || status.replaceAll("_", " ");
}
