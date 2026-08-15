"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ErrandForm from "@/components/errand-form";
import { PlusCircle, ShieldCheck, Loader2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";

export default function NewErrandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [savedErrandId, setSavedErrandId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(response => response.ok ? response.json() : null)
      .then(setProfile)
      .finally(() => setProfileLoading(false));
  }, []);

  async function handleSubmit(data: Record<string, unknown>) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/errands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setLoading(false);
      setError(err.error || "Failed to post errand");
      return;
    }
    const created = await res.json();
    setSavedErrandId(created.id);

    const paymentResponse = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errand_id: created.id }),
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) {
      setLoading(false);
      setError(payment.error || "Your task was saved, but secure checkout could not start.");
      return;
    }
    if (payment.paid) return router.push(`/errands/${created.id}`);
    window.location.assign(payment.authorization_url);
  }

  if (profileLoading) return <div className="dash-loading"><Loader2 size={28} className="spin" /><p>Checking your trust status...</p></div>;

  if (!profile?.is_verified) {
    return (
      <div className="dash-page verification-gate-page">
        <div className="verification-gate-card">
          <span className="verification-gate-icon"><ShieldCheck size={30} /></span>
          <small>Required before transactions</small>
          <h1>Verify once. Request help with confidence.</h1>
          <p>TwinkleGo verifies both customers and runners before money or task access changes hands.</p>
          <Link href="/profile/verify?onboarding=1" className="button"><ShieldCheck size={17} /> Get verified</Link>
          <Link href="/dashboard" className="text-btn">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1><PlusCircle size={24} /> Post an Errand</h1>
          <p>Set the task, see a fair price, then pay before matching begins</p>
        </div>
        <span className="page-trust-pill"><LockKeyhole size={14} /> Verified account</span>
      </div>

      <div className="form-card">
        <ErrandForm onSubmit={handleSubmit} loading={loading} />
        {error && (
          <div className="auth-error" style={{ marginTop: 16 }}>
            {error}
            {savedErrandId ? <Link href={`/errands/${savedErrandId}`}>Open saved task and retry payment</Link> : null}
          </div>
        )}
      </div>
    </div>
  );
}
