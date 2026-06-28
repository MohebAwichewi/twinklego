"use client";

import { useEffect, useState } from "react";
import { Errand, Profile, Wallet } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import {
  ListChecks, CheckCircle, Clock, Wallet as WalletIcon,
  PlusCircle, Users, ArrowRight, Loader2, Star,
} from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/errands").then(r => r.json()),
      fetch("/api/wallet").then(r => r.json()),
    ]).then(([p, e, w]) => {
      setProfile(p);
      setErrands(Array.isArray(e) ? e : []);
      setWallet(w);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  const active = errands.filter(e => ["posted", "accepted", "in_progress"].includes(e.status));
  const completed = errands.filter(e => e.status === "completed");

  const stats = [
    { label: "Active Errands", value: active.length, icon: ListChecks, color: "blue" },
    { label: "Completed", value: completed.length, icon: CheckCircle, color: "teal" },
    { label: "Pending", value: errands.filter(e => e.status === "posted").length, icon: Clock, color: "gold" },
    { label: "Wallet Balance", value: wallet ? formatNGN(wallet.balance) : "₦0", icon: WalletIcon, color: "coral" },
  ];

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Here&apos;s what&apos;s happening with your TwinkleGo account</p>
        </div>
        <Link href="/errands/new" className="button"><PlusCircle size={16} /> Post an Errand</Link>
      </div>

      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <span className={`stat-icon ${color}`}><Icon size={20} /></span>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-section">
          <div className="dash-section-head">
            <h2>Active Errands</h2>
            <Link href="/errands" className="text-link">View all <ArrowRight size={14} /></Link>
          </div>
          {active.length === 0 ? (
            <div className="empty-state">
              <ListChecks size={32} />
              <p>No active errands right now</p>
              <Link href="/errands/new" className="button button-small">Post one now</Link>
            </div>
          ) : (
            <div className="errand-list">
              {active.slice(0, 5).map(e => (
                <Link key={e.id} href={`/errands/${e.id}`} className="errand-row">
                  <span className={`errand-status-dot ${e.status}`} />
                  <div>
                    <strong>{e.title}</strong>
                    <small>{e.category.replace("_", " ")} · {formatNGN(e.price)}</small>
                  </div>
                  <span className="errand-time">{new Date(e.created_at).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="dash-section">
          <div className="dash-section-head">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions">
            <Link href="/errands/new" className="quick-action"><PlusCircle size={20} /><span>Post Errand</span></Link>
            <Link href="/runners" className="quick-action"><Users size={20} /><span>Find Runners</span></Link>
            <Link href="/wallet" className="quick-action"><WalletIcon size={20} /><span>Wallet</span></Link>
            <Link href="/profile" className="quick-action"><Star size={20} /><span>Profile</span></Link>
          </div>

          {!profile?.is_verified && (
            <div className="verify-cta">
              <strong>Get verified to unlock all features</strong>
              <p>Verified users can post errands and accept tasks.</p>
              <Link href="/profile/verify" className="button button-small">Verify identity <ArrowRight size={14} /></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
