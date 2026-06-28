"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  const supabase = createClient();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setVerified(true);
      }
      setChecking(false);
    }
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) setVerified(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  if (checking) {
    return (
      <div className="auth-card auth-center">
        <Loader2 size={32} className="spin" />
        <p>Verifying your email...</p>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="auth-card auth-center">
        <div className="auth-icon-success"><CheckCircle size={40} /></div>
        <h1>Email verified!</h1>
        <p className="auth-sub">Your account is ready. Log in to get started.</p>
        <Link href="/login" className="button auth-btn">Go to login <Mail size={16} /></Link>
      </div>
    );
  }

  return (
    <div className="auth-card auth-center">
      <div className="auth-icon-pending"><Mail size={40} /></div>
      <h1>Check your email</h1>
      <p className="auth-sub">We sent a confirmation link to your email address. Click it to verify your account, then come back here.</p>
      <Link href="/login" className="button auth-btn">I verified — take me to login</Link>
      <p className="auth-back"><Link href="/">← Back to home</Link></p>
    </div>
  );
}
