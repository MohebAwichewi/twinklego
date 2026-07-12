"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Errand, TaskTracking, TaskTrackingPhase } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, Loader2, MapPin, Clock, CheckCircle,
  PlayCircle, XCircle, Star, AlertTriangle, User, PackageCheck,
  Bike, Navigation, LocateFixed,
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

const trackingSteps: {
  phase: TaskTrackingPhase;
  title: string;
  fallback: string;
  icon: typeof CheckCircle;
}[] = [
  { phase: "accepted", title: "Task Accepted", fallback: "Your runner accepted the task.", icon: CheckCircle },
  { phase: "heading_to_pickup", title: "Runner Heading to Pickup", fallback: "Runner is moving toward the pickup point.", icon: MapPin },
  { phase: "picked_up", title: "Item Picked Up", fallback: "The item has been collected.", icon: PackageCheck },
  { phase: "en_route_delivery", title: "On the Way to You", fallback: "Runner is heading to the delivery point.", icon: Bike },
  { phase: "delivered", title: "Delivered", fallback: "The task has been delivered.", icon: CheckCircle },
];

export default function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();
  const [errand, setErrand] = useState<Errand | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tracking, setTracking] = useState<TaskTracking | null>(null);
  const [trackingError, setTrackingError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    fetch(`/api/errands/${id}`).then(r => r.json()).then(data => {
      setErrand(data);
      setTracking(Array.isArray(data.tracking) ? data.tracking[0] ?? null : data.tracking ?? null);
      setLoading(false);
    });
  }, [id, supabase]);

  useEffect(() => {
    if (!errand || !["accepted", "in_progress"].includes(errand.status)) return;

    const loadTracking = () => {
      fetch(`/api/errands/${id}/tracking`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setTracking(data))
        .catch(() => {});
    };

    loadTracking();
    const interval = setInterval(loadTracking, 20_000);
    return () => clearInterval(interval);
  }, [id, errand]);

  useEffect(() => {
    if (!errand || userId !== errand.assigned_runner_id || !["accepted", "in_progress"].includes(errand.status)) return;
    if (!navigator.geolocation) return;

    const pushLocation = () => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          updateTracking(undefined, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            silent: true,
          });
        },
        () => {},
        { enableHighAccuracy: true },
      );
    };

    pushLocation();
    const interval = setInterval(pushLocation, 45_000);
    return () => clearInterval(interval);
  }, [errand, userId]);

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

  async function updateTracking(
    phase?: TaskTrackingPhase,
    options?: { lat?: number; lng?: number; silent?: boolean },
  ) {
    setTrackingError("");
    if (!options?.silent) setUpdating(true);

    let coords = options?.lat && options?.lng ? { lat: options.lat, lng: options.lng } : null;

    if (!coords && navigator.geolocation) {
      coords = await new Promise<{ lat: number; lng: number } | null>(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true },
        );
      });
    }

    const res = await fetch(`/api/errands/${id}/tracking`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, ...coords }),
    });

    if (res.ok) {
      setTracking(await res.json());
    } else if (!options?.silent) {
      const data = await res.json();
      setTrackingError(data.error || "Could not update tracking.");
    }

    if (!options?.silent) setUpdating(false);
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
          {["accepted", "in_progress", "completed"].includes(errand.status) && (
            <div className="detail-card live-tracking-card">
              <div className="tracking-head">
                <div>
                  <h3>Live Task Tracking</h3>
                  <p>Progress updates reduce calls and give both sides peace of mind.</p>
                </div>
                <span className="tracking-live-pill"><LocateFixed size={13} /> Live</span>
              </div>

              <div className="tracking-summary">
                <span><Navigation size={14} /> {tracking?.eta_minutes ? `${tracking.eta_minutes} min ETA` : "ETA updates when runner shares GPS"}</span>
                <span><MapPin size={14} /> {tracking?.distance_to_next_km ? `${tracking.distance_to_next_km} km to next stop` : "Distance pending"}</span>
              </div>

              <div className="tracking-timeline">
                {trackingSteps.map((step, index) => {
                  const currentIndex = tracking ? trackingSteps.findIndex(item => item.phase === tracking.phase) : 0;
                  const done = errand.status === "completed" || index <= currentIndex;
                  const current = errand.status !== "completed" && index === currentIndex;
                  const StepIcon = step.icon;
                  return (
                    <div key={step.phase} className={`tracking-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                      <span className="tracking-step-icon"><StepIcon size={15} /></span>
                      <div>
                        <strong>{step.title}</strong>
                        <small>{trackingLine(step.phase, tracking, step.fallback)}</small>
                      </div>
                    </div>
                  );
                })}
              </div>

              {tracking?.runner_lat && tracking?.runner_lng && (
                <a
                  className="tracking-map-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${tracking.runner_lat},${tracking.runner_lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={14} /> View runner live location
                </a>
              )}

              {isRunner && ["accepted", "in_progress"].includes(errand.status) && (
                <div className="tracking-actions">
                  <button className="button button-small" onClick={() => updateTracking("heading_to_pickup")} disabled={updating}>
                    Heading to pickup
                  </button>
                  <button className="button button-small" onClick={() => updateTracking("picked_up")} disabled={updating}>
                    Item picked up
                  </button>
                  <button className="button button-small" onClick={() => updateTracking("en_route_delivery")} disabled={updating}>
                    On the way
                  </button>
                </div>
              )}
              {trackingError && <div className="auth-error">{trackingError}</div>}
            </div>
          )}

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
              <button className="button" onClick={async () => { await updateTracking("delivered"); await updateStatus("completed"); }} disabled={updating}>
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

function trackingLine(phase: TaskTrackingPhase, tracking: TaskTracking | null, fallback: string) {
  if (!tracking) return fallback;
  if (tracking.phase === phase && tracking.eta_minutes) {
    return `${fallback} ETA ${tracking.eta_minutes} min.`;
  }

  const timestamp = tracking[`${phase}_at` as keyof TaskTracking];
  if (typeof timestamp === "string" && timestamp) {
    return `${fallback} ${new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return fallback;
}
