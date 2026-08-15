"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Banknote, CreditCard, Loader2, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { formatNGN } from "@/lib/geo";

interface FinanceRow {
  id: number;
  amount: number;
  status: string;
  currency: string;
  created_at: string;
  refund_status?: string | null;
  failure_reason?: string | null;
  errand?: { id: number; title: string; status: string } | null;
  customer?: { full_name: string | null } | null;
  runner?: { full_name: string | null } | null;
}

interface FinanceData {
  provider: { configured: boolean; mode: string };
  payments: FinanceRow[];
  payouts: FinanceRow[];
  can_manage_money: boolean;
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/payments", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setData(body);
    else setMessage(body.error || "Financial activity could not be loaded.");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function retryPayout(id: number) {
    if (!window.confirm("Retry this real Paystack payout?")) return;
    await act(`payout-${id}`, { action: "retry_payout", payout_id: id });
  }

  async function refundPayment(id: number) {
    const note = window.prompt("Reason for the full customer refund:");
    if (!note) return;
    if (!window.confirm("Start a real full Paystack refund? This cannot be undone from TwinkleGo.")) return;
    await act(`payment-${id}`, { action: "refund_payment", payment_id: id, note });
  }

  async function act(key: string, body: Record<string, unknown>) {
    setWorking(key);
    setMessage("");
    const response = await fetch("/api/admin/payments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? "Provider action accepted. Status will continue updating by webhook." : result.error || "Provider action failed.");
    setWorking(null);
    await load();
  }

  if (loading) return <div className="dash-loading"><Loader2 size={28} className="spin" /></div>;

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1>Payments & Payouts</h1><p>Provider-backed financial operations and recovery controls.</p></div><button className="button button-small button-outline" onClick={load}><RefreshCw size={15} /> Refresh</button></div>

      <div className={`provider-health ${data?.provider.configured ? "ready" : "blocked"}`}>
        {data?.provider.configured ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
        <div><strong>{data?.provider.configured ? `Paystack ${data.provider.mode} mode connected` : "Paystack secret key missing"}</strong><small>{data?.provider.configured ? "Signed webhooks still need to be configured in the Paystack dashboard." : "Payment, refund, bank verification, and payout actions are safely blocked."}</small></div>
      </div>
      {message ? <div className="auth-success admin-message">{message}</div> : null}

      <section className="admin-finance-section">
        <div className="panel-heading"><h2><CreditCard size={17} /> Customer payments</h2><span>{data?.payments.length || 0} records</span></div>
        <div className="admin-table">
          {!data?.payments.length ? <div className="admin-finance-empty">No payment records yet.</div> : data.payments.map(payment => (
            <div className="admin-row finance-row" key={payment.id}>
              <span className="tx-icon blue"><CreditCard size={16} /></span>
              <div className="admin-row-main"><div><strong>{payment.errand?.title || `Errand #${payment.errand?.id || "-"}`}</strong><small>{payment.customer?.full_name || "Customer"} - {new Date(payment.created_at).toLocaleString()}</small></div></div>
              <strong>{formatNGN(Number(payment.amount))}</strong>
              <span className={`status-badge ${payment.status}`}>{payment.refund_status ? `Refund ${payment.refund_status.replaceAll("_", " ")}` : payment.status}</span>
              {data.can_manage_money && payment.status === "paid" && !["pending", "processing", "needs_attention", "processed"].includes(payment.refund_status || "") && payment.errand?.status !== "completed" ? <button className="icon-btn danger" onClick={() => refundPayment(payment.id)} disabled={working === `payment-${payment.id}`} title="Issue full refund">{working === `payment-${payment.id}` ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}</button> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-finance-section">
        <div className="panel-heading"><h2><Banknote size={17} /> Runner payouts</h2><span>{data?.payouts.length || 0} records</span></div>
        <div className="admin-table">
          {!data?.payouts.length ? <div className="admin-finance-empty">No payout records yet.</div> : data.payouts.map(payout => (
            <div className="admin-row finance-row" key={payout.id}>
              <span className="tx-icon teal"><Banknote size={16} /></span>
              <div className="admin-row-main"><div><strong>{payout.errand?.title || `Errand #${payout.errand?.id || "-"}`}</strong><small>{payout.runner?.full_name || "Runner"} - {new Date(payout.created_at).toLocaleString()}</small>{payout.failure_reason ? <p>{payout.failure_reason}</p> : null}</div></div>
              <strong>{formatNGN(Number(payout.amount))}</strong>
              <span className={`status-badge ${payout.status}`}>{payout.status.replaceAll("_", " ")}</span>
              {data.can_manage_money && ["failed", "reversed"].includes(payout.status) ? <button className="icon-btn success" onClick={() => retryPayout(payout.id)} disabled={working === `payout-${payout.id}`} title="Retry payout">{working === `payout-${payout.id}` ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}</button> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
