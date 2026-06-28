"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DisputeCategory } from "@/lib/types";

const disputeCategories: { value: DisputeCategory; label: string }[] = [
  { value: "service_issue", label: "Service issue" },
  { value: "no_show", label: "No-show" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
];

export default function DisputePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [category, setCategory] = useState<DisputeCategory>("service_issue");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("Please describe the issue"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errand_id: Number(id), category, reason }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    router.push(`/errands/${id}`);
  }

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <Link href={`/errands/${id}`} className="back-link"><ArrowLeft size={15} /> Back to errand</Link>
          <h1><AlertTriangle size={24} /> Raise a Dispute</h1>
          <p>Tell us what went wrong and we&apos;ll help resolve it</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="dispute-form">
          <label>Category
            <select value={category} onChange={e => setCategory(e.target.value as DisputeCategory)}>
              {disputeCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>Describe the issue
            <textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="Please explain what happened in detail..." rows={5} />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="button button-dark" disabled={loading}>
            {loading ? <><Loader2 size={15} className="spin" /> Submitting...</> : <>Submit dispute</>}
          </button>
        </form>
      </div>
    </div>
  );
}
