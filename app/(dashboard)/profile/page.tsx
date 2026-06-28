"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Profile, Verification } from "@/lib/types";
import { Save, ShieldCheck, Loader2, User, Phone, MapPin, AlertTriangle, BadgeCheck, Clock, XCircle } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    role: "customer",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    async function load() {
      const [profileRes, verifyRes] = await Promise.all([
        fetch("/api/profile").then(r => r.json()),
        fetch("/api/verify").then(r => r.json()),
      ]);
      setProfile(profileRes);
      setVerification(verifyRes);
      if (profileRes?.full_name) {
        setForm({
          full_name: profileRes.full_name || "",
          phone: profileRes.phone || "",
          address: profileRes.address || "",
          role: profileRes.role || "customer",
          emergency_contact_name: profileRes.emergency_contact_name || "",
          emergency_contact_phone: profileRes.emergency_contact_phone || "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  const verificationBadge = verification
    ? verification.status === "approved"
      ? { label: "Verified", icon: BadgeCheck, cls: "badge-success" }
      : verification.status === "pending"
        ? { label: "Pending review", icon: Clock, cls: "badge-pending" }
        : { label: "Rejected", icon: XCircle, cls: "badge-error" }
    : null;

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1>Profile</h1>
          <p>Manage your personal information and verification status</p>
        </div>
        <Link href="/profile/verify" className="button button-small">
          <ShieldCheck size={16} /> Verify identity
        </Link>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {profile?.full_name
                ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                : <User size={28} />}
            </div>
            <div className="profile-meta">
              <strong>{profile?.full_name || "Your Name"}</strong>
              <span className="role-tag">{profile?.role === "both" ? "Customer & Runner" : profile?.role === "runner" ? "Runner" : "Customer"}</span>
              {verificationBadge && (
                <span className={`badge ${verificationBadge.cls}`}>
                  <verificationBadge.icon size={13} /> {verificationBadge.label}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            <div className="form-row">
              <label><User size={14} /> Full name
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </label>
              <label><Phone size={14} /> Phone number
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234..." />
              </label>
            </div>
            <label><MapPin size={14} /> Address
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your residential address" />
            </label>
            <label>Account role
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="customer">Customer - I need help</option>
                <option value="runner">Runner - I want to earn</option>
                <option value="both">Both customer and runner</option>
              </select>
            </label>

            <h3 className="form-section-title"><AlertTriangle size={15} /> Emergency Contact</h3>
            <div className="form-row">
              <label>Contact name
                <input value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
              </label>
              <label>Contact phone
                <input value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="+234..." />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="button" disabled={saving}>
                {saving ? <><Loader2 size={15} className="spin" /> Saving...</> : <><Save size={15} /> Save changes</>}
              </button>
              {saved && <span className="save-confirm">Changes saved!</span>}
            </div>
          </form>
        </div>

        <div className="profile-sidebar">
          <div className="info-card">
            <h3>Account info</h3>
            <dl>
              <dt>Member since</dt>
              <dd>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</dd>
              <dt>Rating</dt>
              <dd>{profile?.rating ? `${profile.rating} / 5 (${profile.rating_count} reviews)` : "No ratings yet"}</dd>
              <dt>Role</dt>
              <dd className="capitalize">{profile?.role}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
