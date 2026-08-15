"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Landmark, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Profile, RunnerPayoutAccount } from "@/lib/types";

interface Bank {
  name: string;
  code: string;
}
export default function PayoutAccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<RunnerPayoutAccount | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(response => response.ok ? response.json() : null),
      fetch("/api/payouts/account").then(response => response.ok ? response.json() : null),
      fetch("/api/payouts/banks").then(response => response.ok ? response.json() : []),
    ]).then(([profileData, accountData, bankData]) => {
      setProfile(profileData);
      setAccount(accountData);
      setBanks(Array.isArray(bankData) ? bankData : []);
    }).finally(() => setLoading(false));
  }, []);

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const response = await fetch("/api/payouts/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setError(data.error || "Could not verify this payout account.");
    setAccount(data);
    setAccountNumber("");
    setSuccess("Payout account verified. You can now accept paid tasks.");
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /><p>Loading secure payouts...</p></div>;

  const canEarn = profile?.is_verified && ["runner", "both"].includes(profile.role);

  return (
    <div className="dash-page payout-page">
      <div className="dash-page-head">
        <div>
          <Link href="/profile" className="back-link"><ArrowLeft size={15} /> Back to profile</Link>
          <h1><Landmark size={24} /> Runner payouts</h1>
          <p>Verify where Paystack should send your earnings after customer confirmation.</p>
        </div>
      </div>

      {!canEarn ? (
        <div className="verification-gate-card compact">
          <ShieldCheck size={30} />
          <h2>Verification and a runner role are required</h2>
          <p>Complete identity verification and choose Runner or Both in your profile before adding bank details.</p>
          <Link href={profile?.is_verified ? "/profile" : "/profile/verify"} className="button">Continue setup</Link>
        </div>
      ) : (
        <div className="payout-grid">
          <section className="payout-account-card">
            <span className="payout-card-kicker"><LockKeyhole size={14} /> Bank details are sent directly to Paystack</span>
            <h2>{account ? "Verified payout destination" : "Add your bank account"}</h2>
            {account ? (
              <div className="verified-bank-card">
                <span><Building2 size={22} /></span>
                <div><strong>{account.account_name}</strong><small>{account.bank_name} ending in {account.account_last4}</small></div>
                <BadgeCheck size={20} />
              </div>
            ) : null}

            <form className="payout-form" onSubmit={saveAccount}>
              <label>Bank
                <select required value={bankCode} onChange={event => setBankCode(event.target.value)}>
                  <option value="">Choose your bank</option>
                  {banks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                </select>
              </label>
              <label>10-digit account number
                <input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/\D/g, ""))} placeholder="0123456789" />
              </label>
              {error ? <div className="auth-error">{error}</div> : null}
              {success ? <div className="auth-success">{success}</div> : null}
              <button className="button" disabled={saving || banks.length === 0}>
                {saving ? <><Loader2 size={16} className="spin" /> Verifying with Paystack...</> : <><BadgeCheck size={16} /> Verify payout account</>}
              </button>
            </form>
          </section>

          <aside className="payout-explainer">
            <span>How payout works</span>
            <ol>
              <li>Customer pays before the task is published.</li>
              <li>You accept and complete the task inside TwinkleGo.</li>
              <li>Customer confirms delivery.</li>
              <li>Paystack sends your earnings to this verified account.</li>
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
