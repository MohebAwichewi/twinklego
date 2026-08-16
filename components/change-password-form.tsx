"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function ChangePasswordForm({ admin = false }: { admin?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Your password could not be changed.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Password changed successfully.");
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <div className={`security-layout ${admin ? "security-layout-admin" : ""}`}>
      <section className="security-hero-card">
        <span className="security-hero-icon"><ShieldCheck size={28} /></span>
        <small>{admin ? "Admin account protection" : "Account protection"}</small>
        <h2>Keep your TwinkleGo account yours.</h2>
        <p>Changing your password requires the current one. TwinkleGo never displays or stores either password in the app database.</p>
        <div className="security-points">
          <span><CheckCircle2 size={15} /> Current password check</span>
          <span><CheckCircle2 size={15} /> 12 character minimum</span>
          <span><CheckCircle2 size={15} /> Secure Supabase update</span>
        </div>
      </section>

      <form className="profile-card password-form" onSubmit={handleSubmit}>
        <div className="password-form-title"><span><KeyRound size={21} /></span><div><h2>Change password</h2><p>Use a unique password you do not use elsewhere.</p></div></div>

        <label><LockKeyhole size={14} /> Current password
          <input type={inputType} required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        </label>
        <label><KeyRound size={14} /> New password
          <input type={inputType} required minLength={12} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        </label>
        <label><KeyRound size={14} /> Confirm new password
          <input type={inputType} required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
        </label>

        <button type="button" className="password-visibility" onClick={() => setShowPasswords(value => !value)}>
          {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />} {showPasswords ? "Hide passwords" : "Show passwords"}
        </button>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}
        {success ? <div className="auth-success" role="status">{success}</div> : null}

        <button className="button" type="submit" disabled={loading}>
          {loading ? <><Loader2 size={16} className="spin" /> Changing password...</> : <><KeyRound size={16} /> Change password</>}
        </button>
      </form>
    </div>
  );
}
