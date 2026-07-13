"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Errand, Profile, TaskTracking } from "@/lib/types";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Box,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  Users,
} from "lucide-react";

interface NearbyRunner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: number;
  rating_count: number;
  distance_km: number;
  is_available: boolean;
  is_verified: boolean;
}

const popularRequests = [
  { label: "Pick up & deliver", detail: "Food, groceries, packages", icon: PackageCheck, tone: "teal" },
  { label: "Drop something off", detail: "Items, returns, gifts", icon: Box, tone: "blue" },
  { label: "Store run", detail: "Groceries and essentials", icon: ShoppingBag, tone: "blue" },
  { label: "Pharmacy run", detail: "Medicines and prescriptions", icon: Stethoscope, tone: "teal" },
  { label: "Send documents", detail: "Documents, keys, papers", icon: FileText, tone: "gold" },
  { label: "Other errands", detail: "Anything else nearby", icon: Sparkles, tone: "violet" },
];

export default function DashboardHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [tracking, setTracking] = useState<TaskTracking | null>(null);
  const [nearbyRunner, setNearbyRunner] = useState<NearbyRunner | null>(null);
  const [runnerSearchComplete, setRunnerSearchComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(response => response.json()),
      fetch("/api/errands").then(response => response.json()),
    ])
      .then(async ([profileData, errandData]) => {
        const realErrands = Array.isArray(errandData) ? errandData : [];
        setProfile(profileData);
        setErrands(realErrands);

        const active = realErrands.find((errand: Errand) => ["accepted", "in_progress"].includes(errand.status));
        if (active) {
          const response = await fetch(`/api/errands/${active.id}/tracking`);
          if (response.ok) setTracking(await response.json());
        }

        findNearbyRunner(profileData);
      })
      .finally(() => setLoading(false));
  }, []);

  function findNearbyRunner(currentProfile: Profile | null) {
    const load = async (lat: number, lng: number) => {
      try {
        const response = await fetch(`/api/runners/nearby?lat=${lat}&lng=${lng}&radius=15`);
        const data = await response.json();
        setNearbyRunner(Array.isArray(data) ? data[0] ?? null : null);
      } finally {
        setRunnerSearchComplete(true);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => load(position.coords.latitude, position.coords.longitude),
        () => currentProfile?.lat && currentProfile?.lng
          ? load(Number(currentProfile.lat), Number(currentProfile.lng))
          : setRunnerSearchComplete(true),
        { enableHighAccuracy: true, timeout: 8_000 },
      );
    } else if (currentProfile?.lat && currentProfile?.lng) {
      load(Number(currentProfile.lat), Number(currentProfile.lng));
    } else {
      setRunnerSearchComplete(true);
    }
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /><p>Loading your live account...</p></div>;

  const activeErrand = errands.find(errand => ["accepted", "in_progress"].includes(errand.status));
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const requestHref = query.trim() ? `/errands/new?title=${encodeURIComponent(query.trim())}` : "/errands/new";

  return (
    <div className="concierge-home">
      <section className="concierge-compose">
        <div className="concierge-intro">
          <span className="concierge-greeting">Good {greetingPeriod()}, {firstName}</span>
          <h1>What can we take off<br />your plate today?</h1>
          <p>Request help from identity-verified runners available near your real location.</p>
        </div>

        <div className="request-composer">
          <div className="composer-location"><MapPin size={18} /><span>{profile?.address || "Add your home area for better local matches"}</span><Link href="/profile">Change</Link></div>
          <label className="composer-search">
            <Search size={20} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="What do you need help with?" />
          </label>
          <div className="composer-label">Popular requests</div>
          <div className="request-options">
            {popularRequests.map(({ label, detail, icon: Icon, tone }) => (
              <button key={label} type="button" onClick={() => setQuery(label)} className={query === label ? "selected" : ""}>
                <span className={`request-option-icon ${tone}`}><Icon size={18} /></span>
                <span><strong>{label}</strong><small>{detail}</small></span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <Link href={requestHref} className="button composer-primary">Start a request <ArrowRight size={18} /></Link>
        </div>
        <p className="composer-trust"><ShieldCheck size={19} /> Verification, GPS records, reviews, and dispute support are connected to every task.</p>
      </section>

      <aside className="concierge-aside">
        <section className="active-request-panel">
          <div className="panel-heading"><h2>Active request</h2><Link href="/errands">View all</Link></div>
          {activeErrand ? (
            <Link href={`/errands/${activeErrand.id}`} className="active-request-body">
              <span className="active-status"><Bike size={14} /> {tracking ? trackingLabel(tracking.phase) : activeErrand.status.replace("_", " ")}</span>
              <div className="active-route-layout">
                <div className="active-steps">
                  <div className="active-step done"><span><CheckCircle2 size={15} /></span><div><strong>Task accepted</strong><small>{activeErrand.assigned_runner?.full_name || "Runner assigned"}</small></div></div>
                  <div className={`active-step ${tracking ? "current" : ""}`}><span><Bike size={15} /></span><div><strong>{tracking ? trackingLabel(tracking.phase) : "Waiting for runner update"}</strong><small>{tracking?.eta_minutes ? `${tracking.eta_minutes} min ETA` : "ETA appears with live GPS"}</small></div></div>
                  <div className="active-step"><span><PackageCheck size={15} /></span><div><strong>Completion</strong><small>Payment releases after completion</small></div></div>
                </div>
                <TaskMap errand={activeErrand} tracking={tracking} />
              </div>
              <span className="active-request-link">See request details <ArrowRight size={15} /></span>
            </Link>
          ) : (
            <div className="active-empty">
              <span><Clock3 size={21} /></span><div><strong>No active request</strong><p>Real task progress will appear here after a runner accepts.</p></div>
            </div>
          )}
        </section>

        <section className="trusted-runner-panel">
          <div className="panel-heading"><h2>Verified help nearby</h2><Link href="/runners">See all</Link></div>
          {nearbyRunner ? (
            <>
              <div className="runner-profile-card runner-profile-real">
                <RunnerAvatar runner={nearbyRunner} />
                <div className="runner-profile-copy">
                  <span className="verified-pill"><BadgeCheck size={14} /> Verified runner</span>
                  <h3>{nearbyRunner.full_name || "Verified runner"}</h3>
                  <p><Star size={14} fill={nearbyRunner.rating_count ? "currentColor" : "none"} /> {nearbyRunner.rating_count ? <><strong>{nearbyRunner.rating}</strong> · {nearbyRunner.rating_count} reviews</> : "No reviews yet"}</p>
                  <p><MapPin size={14} /> {nearbyRunner.distance_km} km away</p>
                </div>
              </div>
              <div className="runner-proof"><ShieldCheck size={19} /><span><strong>Identity verified and currently available.</strong><small>Distance is calculated from live coordinates.</small></span></div>
              <Link href={`/errands/new?runner=${nearbyRunner.id}`} className="nearby-link">Request this runner <ArrowRight size={15} /></Link>
            </>
          ) : (
            <div className="active-empty">
              <span>{runnerSearchComplete ? <Users size={20} /> : <Loader2 size={20} className="spin" />}</span>
              <div><strong>{runnerSearchComplete ? "No verified runner is currently available nearby" : "Checking live availability"}</strong><p>{runnerSearchComplete ? "Try again later or enable location access." : "Using your location to calculate real distance."}</p></div>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function RunnerAvatar({ runner }: { runner: NearbyRunner }) {
  if (runner.avatar_url) return <img className="runner-real-avatar" src={runner.avatar_url} alt={runner.full_name || "Verified runner"} />;
  const initials = runner.full_name?.split(" ").map(name => name[0]).join("").slice(0, 2).toUpperCase() || "R";
  return <span className="runner-real-avatar runner-initials" aria-label={runner.full_name || "Verified runner"}>{initials}</span>;
}

function TaskMap({ errand, tracking }: { errand: Errand; tracking: TaskTracking | null }) {
  const lat = tracking?.runner_lat ?? errand.pickup_lat ?? errand.dropoff_lat;
  const lng = tracking?.runner_lng ?? errand.pickup_lng ?? errand.dropoff_lng;
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return <div className="active-map-empty"><MapPin size={20} /><span>Map coordinates unavailable</span></div>;
  }

  return <iframe className="active-map" title="Live task location" src={osmEmbed(Number(lat), Number(lng))} loading="lazy" />;
}

function osmEmbed(lat: number, lng: number) {
  const delta = 0.009;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function trackingLabel(phase: TaskTracking["phase"]) {
  return ({
    accepted: "Task accepted",
    heading_to_pickup: "Runner heading to pickup",
    picked_up: "Item picked up",
    en_route_delivery: "Runner on the way",
    delivered: "Delivered",
  })[phase];
}

function greetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
