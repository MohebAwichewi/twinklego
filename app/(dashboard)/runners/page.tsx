"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Star, Users, Wifi } from "lucide-react";
import { Profile } from "@/lib/types";

interface RunnerResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: number;
  rating_count: number;
  distance_km: number;
  is_available: boolean;
  is_verified: boolean;
}

export default function RunnersPage() {
  const [runners, setRunners] = useState<RunnerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        const res = await fetch(`/api/runners/nearby?lat=${c.lat}&lng=${c.lng}&radius=15`);
        const data = await res.json();
        setRunners(Array.isArray(data) ? data : []);
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1><Users size={24} /> Nearby Runners</h1>
          <p>Find verified, available runners close to you</p>
        </div>
      </div>

      {loading ? (
        <div className="dash-loading"><Loader2 size={28} className="spin" /><p>Finding runners near you...</p></div>
      ) : runners.length === 0 ? (
        <div className="empty-state">
          <Users size={36} />
          <p>No available runners nearby right now</p>
          <small>Try again later or expand your search radius</small>
        </div>
      ) : (
        <div className="runners-grid">
          {runners.map(r => (
            <div key={r.id} className="runner-card-full">
              <div className="runner-card-top">
                <div className="avatar-circle sm">
                  {r.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
                </div>
                <div>
                  <strong>{r.full_name || "Runner"}</strong>
                  <div className="runner-meta">
                    <span><Star size={12} fill="currentColor" /> {r.rating} ({r.rating_count})</span>
                    <span><MapPin size={12} /> {r.distance_km} km away</span>
                  </div>
                </div>
                <span className="avail-dot" title="Available"><Wifi size={12} /></span>
              </div>
              <button
                className="button button-small"
                onClick={() => window.location.href = `/errands/new?runner=${r.id}`}
              >
                Request help
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
