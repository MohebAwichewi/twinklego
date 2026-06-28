"use client";

import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function AvailabilityToggle() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(p => {
      if (p?.is_available !== undefined) setAvailable(p.is_available);
    }).catch(() => {});
  }, []);

  const trackGps = useCallback(async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      });
    }, () => {}, { enableHighAccuracy: true });
  }, []);

  useEffect(() => {
    if (!available) return;
    trackGps();
    const interval = setInterval(trackGps, 60_000); // track every 60s
    return () => clearInterval(interval);
  }, [available, trackGps]);

  async function toggle() {
    setLoading(true);
    const next = !available;
    const res = await fetch("/api/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: next }),
    });
    if (res.ok) {
      setAvailable(next);
      if (next) trackGps();
    }
    setLoading(false);
  }

  return (
    <button
      className={`avail-toggle ${available ? "avail-on" : "avail-off"}`}
      onClick={toggle}
      disabled={loading}
      title={available ? "Go offline" : "Go online"}
    >
      {available ? <Wifi size={15} /> : <WifiOff size={15} />}
      <span>{available ? "Online" : "Offline"}</span>
    </button>
  );
}
