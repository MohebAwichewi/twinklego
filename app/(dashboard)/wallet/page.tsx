"use client";

import { useEffect, useState } from "react";
import type { Profile, RunnerPayoutAccount, Transaction } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  Loader2,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const typeIcons: Record<string, typeof ArrowDownLeft> = {
  payment: ArrowUpRight,
  earning: ArrowDownLeft,
  refund: RefreshCw,
};

const typeColors: Record<string, string> = {
  payment: "coral",
  earning: "teal",
  refund: "blue",
};

export default function WalletPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payoutAccount, setPayoutAccount] = useState<RunnerPayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/wallet/transactions").then(response => response.json()),
      fetch("/api/profile").then(response => response.json()),
      fetch("/api/payouts/account").then(async response => response.ok ? response.json() : null),
    ]).then(([transactionData, profileData, payoutData]) => {
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setProfile(profileData?.id ? profileData : null);
      setPayoutAccount(payoutData?.id ? payoutData : null);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  const totalEarned = transactions.filter(item => item.type === "earning").reduce((sum, item) => sum + Number(item.amount), 0);
  const totalSpent = Math.abs(transactions.filter(item => item.type === "payment").reduce((sum, item) => sum + Number(item.amount), 0));
  const canEarn = profile?.role === "runner" || profile?.role === "both";

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1><ReceiptText size={25} /> Payments</h1>
          <p>Real Paystack payments and payouts connected to your TwinkleGo tasks.</p>
        </div>
        {canEarn ? <Link href="/profile/payout" className="button button-small"><Building2 size={16} /> Payout account</Link> : null}
      </div>

      <section className="payment-ledger-hero">
        <div className="payment-ledger-copy">
          <span><ShieldCheck size={17} /> Payment protected workflow</span>
          <h2>Money only moves with real task progress.</h2>
          <p>Customers pay before matching. Runner payout starts only after the customer confirms completion, while TwinkleGo records its commission automatically.</p>
          <div className="payment-flow-mini" aria-label="Payment flow">
            <span><CreditCard size={14} /> Customer pays</span><ArrowRight size={14} />
            <span><LockKeyhole size={14} /> Task completed</span><ArrowRight size={14} />
            <span><Building2 size={14} /> Runner paid</span>
          </div>
        </div>
        {canEarn ? (
          <div className={`payout-readiness ${payoutAccount?.is_verified ? "ready" : ""}`}>
            <small>Runner payout readiness</small>
            <strong>{payoutAccount?.is_verified ? "Bank account verified" : "Action required"}</strong>
            <p>{payoutAccount?.is_verified ? `${payoutAccount.bank_name} ending ${payoutAccount.account_last4}` : "Add a verified Nigerian bank account before accepting paid tasks."}</p>
            <Link href="/profile/payout">{payoutAccount?.is_verified ? "Manage payout account" : "Set up payouts"} <ArrowRight size={14} /></Link>
          </div>
        ) : null}
      </section>

      <div className="wallet-overview payment-stats-grid">
        <div className="wallet-stat"><ArrowDownLeft size={18} className="teal" /><div><small>Runner payouts received</small><strong>{formatNGN(totalEarned)}</strong></div></div>
        <div className="wallet-stat"><ArrowUpRight size={18} className="coral" /><div><small>Customer payments made</small><strong>{formatNGN(totalSpent)}</strong></div></div>
      </div>

      <div className="dash-section">
        <h2>Payment activity</h2>
        {transactions.length === 0 ? (
          <div className="empty-state"><ReceiptText size={32} /><p>No processed payments yet</p><small>Your real Paystack task payments and payouts will appear here.</small></div>
        ) : (
          <div className="transaction-list">
            {transactions.map(transaction => {
              const Icon = typeIcons[transaction.type] || Repeat;
              const color = typeColors[transaction.type] || "blue";
              return (
                <div key={transaction.id} className="transaction-row">
                  <span className={`tx-icon ${color}`}><Icon size={16} /></span>
                  <div className="tx-main"><strong>{transaction.type === "earning" ? "Runner payout" : transaction.type === "payment" ? "Task payment" : "Refund"}</strong><small>{transaction.description || "Paystack transaction"}</small></div>
                  <div className="tx-side"><strong className={Number(transaction.amount) > 0 ? "text-teal" : "text-coral"}>{Number(transaction.amount) > 0 ? "+" : "-"}{formatNGN(Math.abs(Number(transaction.amount)))}</strong><time>{new Date(transaction.created_at).toLocaleDateString()}</time></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
