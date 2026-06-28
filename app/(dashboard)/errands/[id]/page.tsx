"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Errand } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, Loader2, MapPin, Clock, CheckCircle,
  PlayCircle, XCircle, Star, AlertTriangle, User,
} from "lucide-react";
import Link from "next/link";

const statusFlow: Record<string, string[]> = {
  posted: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  disputed: [],
};

const statusLabels: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  posted: { label: "Posted", icon: Clock, color: "gold" },
  accepted: { label: "Accepted", icon: CheckCircle, color: "blue" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "teal" },
  completed: { label: "Completed", icon: CheckCircle, color: "teal" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "coral" },
  disputed: { label: "Disputed", icon: AlertTriangle, color: "coral" },
};

export default function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    fetch(`/api/errands/${id}`).then(r => r.json()).then(data => {
      setErrand(data);
      setLoading(false);
    });
  }, [id, supabase]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    const res = await fetch(`/api/errands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setErrand(updated);
    }
    setUpdating(false);
  }

  async function acceptAsRunner() {
    setUpdating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setUpdating(false);
    const res = await fetch(`/api/errands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted", assigned_runner_id: user.id }),
    });
    if (res.ok) setErrand(await res.json());
    setUpdating(false);
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;
  if (!errand) return <div className="dash-loading"><p>Errand not found</p></div>;

  const isCustomer = userId === errand.customer_id;
  const isRunner = userId === errand.assigned_runner_id;
  const info = statusLabels[errand.status] || statusLabels.posted;
  const StatusIcon = info.icon;

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <Link href="/errands" className="back-link"><ArrowLeft size={15} /> All errands</Link>
          <h1>{errand.title}</h1>
          <p>{errand.category.replace("_", " ")} · Posted {new Date(errand.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`status-badge lg ${errand.status}`}>
          <StatusIcon size={15} /> {info.label}
        </span>
      </div>

      {/* Status Timeline */}
      <div className="status-timeline">
        {["posted", "accepted", "in_progress", "completed"].map((s, i) => {
          const current = ["posted", "accepted", "in_progress", "completed"].indexOf(errand.status);
          const done = i <= current && errand.status !== "cancelled";
          return (
            <div key={s} className={`timeline-step ${done ? "done" : ""} ${s === errand.status ? "current" : ""}`}>
              <div className="timeline-dot" />
              <span>{s.replace("_", " ")}</span>
            </div>
          );
        })}
      </div>

      <div className="errand-detail-grid">
        <div className="errand-detail-main">
          <div className="detail-card">
            <h3>Details</h3>
            <p>{errand.description || "No description provided."}</p>
            <dl className="detail-meta">
              <dt>Price</dt><dd className="price-big">{formatNGN(errand.price)}</dd>
              {errand.distance_km && <><dt>Distance</dt><dd>{errand.distance_km} km</dd></>}
            </dl>
          </div>

          <div className="detail-card">
            <h3>Locations</h3>
            <div className="location-row">
              <MapPin size={16} className="coral" />
              <div><small>Pickup</small><strong>{errand.pickup_address || "Not specified"}</strong></div>
            </div>
            {errand.dropoff_address && (
              <div className="location-row">
                <MapPin size={16} className="blue" />
                <div><small>Dropoff</small><strong>{errand.dropoff_address}</strong></div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="detail-actions">
            {errand.status === "posted" && !isCustomer && (
              <button className="button" onClick={acceptAsRunner} disabled={updating}>
                {updating ? "Accepting..." : "Accept this errand"}
              </button>
            )}
            {isRunner && errand.status === "accepted" && (
              <button className="button" onClick={() => updateStatus("in_progress")} disabled={updating}>
                {updating ? <Loader2 size={15} className="spin" /> : <PlayCircle size={15} />} Start task
              </button>
            )}
            {isRunner && errand.status === "in_progress" && (
              <button className="button" onClick={() => updateStatus("completed")} disabled={updating}>
                {updating ? <Loader2 size={15} className="spin" /> : <CheckCircle size={15} />} Mark complete
              </button>
            )}
            {(isCustomer || isRunner) && ["posted", "accepted", "in_progress"].includes(errand.status) && (
              <>
                {errand.status !== "posted" && (
                  <Link href={`/errands/${id}/dispute`} className="text-btn danger"><AlertTriangle size={14} /> Raise dispute</Link>
                )}
                {isCustomer && errand.status === "posted" && (
                  <button className="text-btn danger" onClick={() => updateStatus("cancelled")} disabled={updating}>
                    <XCircle size={14} /> Cancel errand
                  </button>
                )}
              </>
            )}
            {errand.status === "completed" && (
              <Link href={`/errands/${id}/review`} className="button"><Star size={15} /> Leave a review</Link>
            )}
          </div>
        </div>

        <div className="errand-detail-side">
          {errand.customer && (
            <div className="detail-card">
              <h3>Customer</h3>
              <div className="user-mini">
                <div className="avatar-sm">{errand.customer.full_name?.[0]?.toUpperCase() || <User size={14} />}</div>
                <div>
                  <strong>{errand.customer.full_name}</strong>
                  {errand.customer.is_verified && <span className="badge badge-success sm">Verified</span>}
                </div>
              </div>
            </div>
          )}
          {errand.assigned_runner && (
            <div className="detail-card">
              <h3>Runner</h3>
              <div className="user-mini">
                <div className="avatar-sm">{errand.assigned_runner.full_name?.[0]?.toUpperCase() || <User size={14} />}</div>
                <div>
                  <strong>{errand.assigned_runner.full_name}</strong>
                  <small>{errand.assigned_runner.rating} ★ ({errand.assigned_runner.rating_count})</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
