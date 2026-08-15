"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    let error: Error | null = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      error = result.error;
    } catch {
      error = new Error("Account services are temporarily unreachable. Please try again shortly.");
    }
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("email not confirmed")
          ? "This older account still needs activation. Create the account again with the same email and password to activate it."
          : error.message,
      );
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true);
    let error: Error | null = null;
    try {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/api/auth/callback?next=/profile` });
      error = result.error;
    } catch {
      error = new Error("Password reset services are temporarily unreachable. Please try again shortly.");
    }
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess("Password reset link sent to your email.");
  }

  return (
    <div className="auth-card">
      <div className="auth-badge"><Sparkles size={16} /> Welcome back</div>
      <h1>Log in to TwinkleGo</h1>
      <p className="auth-sub">Don&apos;t have an account? <Link href="/signup">Sign up free</Link></p>

      <form onSubmit={handleLogin} className="auth-form">
        <label>Email
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>Password
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
        </label>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <button type="submit" className="button auth-btn" disabled={loading}>
          {loading ? <><Loader2 size={16} className="spin" /> Logging in...</> : <>Log in <ArrowRight size={16} /></>}
        </button>

        <button type="button" className="auth-link-btn" onClick={handleForgotPassword} disabled={loading}>
          Forgot password?
        </button>
      </form>

      <p className="auth-back"><Link href="/">← Back to home</Link></p>
    </div>
  );
}
