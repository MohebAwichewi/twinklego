"use client";

import { useEffect, useState } from "react";
import { Verification } from "@/lib/types";
import { ArrowLeft, Upload, Loader2, ShieldCheck, BadgeCheck, Clock, XCircle } from "lucide-react";
import Link from "next/link";

const idTypes = [
  { value: "national_id", label: "National ID Card (NIN)" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "International Passport" },
  { value: "voters_card", label: "Voter's Card" },
];

export default function VerifyPage() {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [idImage, setIdImage] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/verify").then(r => r.json()).then(data => {
      setVerification(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    if (!idImage) {
      setSubmitting(false);
      setError("Please upload a clear photo of your ID.");
      return;
    }
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_type: idType, id_number: idNumber, id_image_url: idImage }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setVerification(data);
    setSuccess(true);
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  const statusInfo = verification
    ? verification.status === "approved"
      ? { label: "You are verified!", icon: BadgeCheck, cls: "verify-success" }
      : verification.status === "pending"
        ? { label: "Verification pending", icon: Clock, cls: "verify-pending" }
        : { label: "Verification rejected", icon: XCircle, cls: "verify-error" }
    : null;

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <Link href="/profile" className="back-link"><ArrowLeft size={15} /> Back to profile</Link>
          <h1>Identity Verification</h1>
          <p>Submit your government-issued ID to become a verified TwinkleGo user</p>
        </div>
      </div>

      {statusInfo && (
        <div className={`verify-banner ${statusInfo.cls}`}>
          <statusInfo.icon size={22} />
          <div>
            <strong>{statusInfo.label}</strong>
            {verification?.reviewer_notes && <small>{verification.reviewer_notes}</small>}
          </div>
        </div>
      )}

      {verification?.status === "approved" ? (
        <div className="verify-done">
          <ShieldCheck size={48} />
          <h2>You&apos;re all set!</h2>
          <p>Your identity has been verified. You can now post errands and accept tasks.</p>
        </div>
      ) : (
        <div className="verify-form-card">
          <h2><ShieldCheck size={20} /> Submit your ID</h2>
          <form onSubmit={handleSubmit} className="verify-form">
            <label>ID type
              <select value={idType} onChange={e => setIdType(e.target.value)}>
                {idTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label>ID number
              <input required value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" />
            </label>

            <div className="upload-zone">
              <Upload size={24} />
              <p>Upload a clear photo of your ID</p>
              <small>{idImage ? "ID photo attached" : "JPG or PNG, max 5MB"}</small>
              <input
                type="file"
                accept="image/*"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError("ID photo must be under 5MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setIdImage(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">Verification submitted! We&apos;ll review it shortly.</div>}

            <button type="submit" className="button" disabled={submitting || success}>
              {submitting ? <><Loader2 size={15} className="spin" /> Submitting...</> : <>Submit for review</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
