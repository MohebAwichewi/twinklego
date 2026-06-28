"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/lib/types";

const roles: { value: UserRole; label: string; desc: string }[] = [
  { value: "customer", label: "I need help", desc: "Post errands and get trusted assistance" },
  { value: "runner", label: "I want to earn", desc: "Complete tasks and earn income" },
  { value: "both", label: "Both", desc: "Help others and get help when you need it" },
];

export default function SignupPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    setLoading(false);
    if (error) { setError(error.message); return; }
    window.location.href = "/verify";
  }

  return (
    <div className="auth-card">
      <div className="auth-badge"><Sparkles size={16} /> Join TwinkleGo</div>
      <h1>Create your account</h1>
      <p className="auth-sub">Already have an account? <Link href="/login">Log in</Link></p>

      <form onSubmit={handleSignup} className="auth-form">
        <label>Full name
          <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
        </label>
        <label>Email
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>Password
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </label>

        <fieldset className="auth-role-picker">
          <legend>What brings you here?</legend>
          {roles.map(r => (
            <label key={r.value} className={`role-option ${role === r.value ? "active" : ""}`}>
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />
              <span><strong>{r.label}</strong><small>{r.desc}</small></span>
            </label>
          ))}
        </fieldset>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="button auth-btn" disabled={loading}>
          {loading ? <><Loader2 size={16} className="spin" /> Creating account...</> : <>Create account <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="auth-back"><Link href="/">← Back to home</Link></p>
    </div>
  );
}
