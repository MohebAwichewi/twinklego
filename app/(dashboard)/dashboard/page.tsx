"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Errand, Profile } from "@/lib/types";
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
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(response => response.json()),
      fetch("/api/errands").then(response => response.json()),
    ])
      .then(([profileData, errandData]) => {
        setProfile(profileData);
        setErrands(Array.isArray(errandData) ? errandData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /><p>Bringing nearby help into view...</p></div>;

  const activeErrand = errands.find(errand => ["accepted", "in_progress"].includes(errand.status));
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const requestHref = query.trim() ? `/errands/new?title=${encodeURIComponent(query.trim())}` : "/errands/new";

  return (
    <div className="concierge-home">
      <section className="concierge-compose">
        <div className="concierge-intro">
          <span className="concierge-greeting">Good {greetingPeriod()}, {firstName}</span>
          <h1>What can we take off<br />your plate today?</h1>
          <p>Trusted help from verified runners in your neighborhood.</p>
        </div>

        <div className="request-composer">
          <div className="composer-location"><MapPin size={18} /><span>{profile?.address || "Set your pickup location"}</span><Link href="/profile">Change</Link></div>
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
        <p className="composer-trust"><ShieldCheck size={19} /> Every runner is identity checked before accepting tasks.</p>
      </section>

      <aside className="concierge-aside">
        <section className="active-request-panel">
          <div className="panel-heading"><h2>Active request</h2><Link href="/errands">View all</Link></div>
          {activeErrand ? (
            <Link href={`/errands/${activeErrand.id}`} className="active-request-body">
              <span className="active-status"><Bike size={14} /> Runner is on the way</span>
              <div className="active-route-layout">
                <div className="active-steps">
                  <div className="active-step done"><span><CheckCircle2 size={15} /></span><div><strong>Task accepted</strong><small>Your runner is confirmed</small></div></div>
                  <div className="active-step current"><span><Bike size={15} /></span><div><strong>Heading to pickup</strong><small>About 8 minutes away</small></div></div>
                  <div className="active-step"><span><PackageCheck size={15} /></span><div><strong>On the way to you</strong><small>ETA updates live</small></div></div>
                </div>
                <Image src="/images/live-route-map.webp" alt="Live route between runner and customer" width={260} height={210} className="active-map" />
              </div>
              <span className="active-request-link">See request details <ArrowRight size={15} /></span>
            </Link>
          ) : (
            <div className="active-empty">
              <span><Clock3 size={21} /></span><div><strong>No active request</strong><p>Your live task progress will appear here.</p></div>
            </div>
          )}
        </section>

        <section className="trusted-runner-panel">
          <div className="panel-heading"><h2>Trusted help nearby</h2><Link href="/runners">See all</Link></div>
          <div className="runner-profile-card">
            <Image src="/images/verified-runner-kunle.webp" alt="Kunle, a verified runner" width={126} height={126} />
            <div className="runner-profile-copy">
              <span className="verified-pill"><BadgeCheck size={14} /> Verified runner</span>
              <h3>Kunle A.</h3>
              <p><Star size={14} fill="currentColor" /> <strong>4.9</strong> · 312 tasks completed</p>
              <p><MapPin size={14} /> 8 minutes away</p>
            </div>
          </div>
          <div className="runner-proof"><ShieldCheck size={19} /><span><strong>Background checked. Identity verified.</strong><small>Here to help when you need it.</small></span></div>
          <Link href="/runners" className="nearby-link">See more nearby runners <ArrowRight size={15} /></Link>
        </section>
      </aside>
    </div>
  );
}

function greetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
