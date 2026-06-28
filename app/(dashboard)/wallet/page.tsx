"use client";

import { useEffect, useState } from "react";
import { Wallet, Transaction } from "@/lib/types";
import { formatNGN } from "@/lib/geo";
import {
  Wallet as WalletIcon, Loader2, ArrowDownLeft, ArrowUpRight,
  CreditCard, Repeat, RefreshCw,
} from "lucide-react";

const typeIcons: Record<string, typeof ArrowDownLeft> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  payment: ArrowUpRight,
  earning: ArrowDownLeft,
  refund: RefreshCw,
};

const typeColors: Record<string, string> = {
  deposit: "teal",
  withdrawal: "coral",
  payment: "coral",
  earning: "teal",
  refund: "blue",
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWallet() {
    Promise.all([
      fetch("/api/wallet").then(r => r.json()),
      fetch("/api/wallet/transactions").then(r => r.json()),
    ]).then(([w, t]) => {
      setWallet(w);
      setTransactions(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function adjustWallet(type: "deposit" | "withdrawal") {
    const label = type === "deposit" ? "add" : "withdraw";
    const input = window.prompt(`How much would you like to ${label}?`, "5000");
    if (!input) return;

    setUpdating(true);
    setMessage("");
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(input) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Wallet update failed.");
    } else {
      setWallet(data);
      setMessage(type === "deposit" ? "Funds added." : "Withdrawal recorded.");
      const t = await fetch("/api/wallet/transactions").then(r => r.json());
      setTransactions(Array.isArray(t) ? t : []);
    }
    setUpdating(false);
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1><WalletIcon size={24} /> Wallet</h1>
          <p>Track your balance and transactions</p>
        </div>
      </div>

      <div className="wallet-overview">
        <div className="wallet-balance-card">
          <small>Current Balance</small>
          <strong>{wallet ? formatNGN(wallet.balance) : "₦0"}</strong>
          <div className="wallet-actions-row">
            <button className="wallet-action-btn" onClick={() => adjustWallet("deposit")} disabled={updating}><CreditCard size={16} /> Add funds</button>
            <button className="wallet-action-btn outline" onClick={() => adjustWallet("withdrawal")} disabled={updating}><ArrowUpRight size={16} /> Withdraw</button>
          </div>
        </div>
        <div className="wallet-stats">
          <div className="wallet-stat">
            <ArrowDownLeft size={18} className="teal" />
            <div>
              <small>Total earned</small>
              <strong>{formatNGN(transactions.filter(t => t.type === "earning").reduce((s, t) => s + Number(t.amount), 0))}</strong>
            </div>
          </div>
          <div className="wallet-stat">
            <ArrowUpRight size={18} className="coral" />
            <div>
              <small>Total spent</small>
              <strong>{formatNGN(Math.abs(transactions.filter(t => t.type === "payment").reduce((s, t) => s + Number(t.amount), 0)))}</strong>
            </div>
          </div>
        </div>
      </div>
      {message && <div className={message.includes("failed") || message.includes("valid") ? "auth-error" : "auth-success"} style={{ marginBottom: 18 }}>{message}</div>}

      <div className="dash-section">
        <h2>Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <WalletIcon size={32} />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map(t => {
              const Icon = typeIcons[t.type] || Repeat;
              const color = typeColors[t.type] || "blue";
              return (
                <div key={t.id} className="transaction-row">
                  <span className={`tx-icon ${color}`}><Icon size={16} /></span>
                  <div className="tx-main">
                    <strong>{t.type.charAt(0).toUpperCase() + t.type.slice(1)}</strong>
                    <small>{t.description || "—"}</small>
                  </div>
                  <div className="tx-side">
                    <strong className={Number(t.amount) > 0 ? "text-teal" : "text-coral"}>
                      {Number(t.amount) > 0 ? "+" : ""}{formatNGN(Math.abs(Number(t.amount)))}
                    </strong>
                    <time>{new Date(t.created_at).toLocaleDateString()}</time>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
