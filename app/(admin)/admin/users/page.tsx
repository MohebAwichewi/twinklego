"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Users, ShieldCheck, Shield, Search, Crown, Ban, Trash2, UserPlus, RotateCcw } from "lucide-react";
import { Profile } from "@/lib/types";

interface ManagedUser extends Profile {
  email: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [viewer, setViewer] = useState<{ id: string; is_super_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers(query = "") {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not load accounts.");
    setUsers(Array.isArray(data.users) ? data.users : []);
    setViewer(data.viewer || null);
    setLoading(false);
  }

  async function accountAction(id: string, action: string) {
    if (action === "delete" && !window.confirm("Permanently delete this account and its related profile data?")) return;
    setProcessing(`${id}:${action}`);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Account action failed.");
    else { setMessage("Account updated."); await fetchUsers(search); }
    setProcessing(null);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProcessing("create");
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        make_admin: form.get("make_admin") === "on",
      }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not create account.");
    else { event.currentTarget.reset(); setMessage("Confirmed account created. The user can log in immediately."); await fetchUsers(); }
    setProcessing(null);
  }

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1><Users size={24} /> Account Management</h1><p>Real Supabase accounts, verification, access, and moderation</p></div></div>

      {viewer?.is_super_admin ? (
        <form className="admin-create-form" onSubmit={createAccount}>
          <div><UserPlus size={20} /><span><strong>Create a confirmed account</strong><small>No confirmation email is sent.</small></span></div>
          <input name="full_name" required placeholder="Full name" />
          <input name="email" type="email" required placeholder="Email" />
          <input name="password" type="password" minLength={12} required placeholder="Temporary password (12+ characters)" />
          <select name="role" defaultValue="customer"><option value="customer">Customer</option><option value="runner">Runner</option><option value="both">Customer & runner</option></select>
          <label className="admin-checkbox"><input name="make_admin" type="checkbox" /> Admin access</label>
          <button className="button button-small" disabled={processing === "create"}>{processing === "create" ? <Loader2 size={15} className="spin" /> : <UserPlus size={15} />} Create</button>
        </form>
      ) : null}

      <div className="search-bar">
        <Search size={16} />
        <input placeholder="Search by name, email, or phone" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === "Enter" && fetchUsers(search)} />
        <button className="text-btn" onClick={() => fetchUsers(search)}>Search</button>
      </div>
      {error ? <div className="auth-error admin-message">{error}</div> : null}
      {message ? <div className="auth-success admin-message">{message}</div> : null}

      {loading ? <div className="dash-loading"><Loader2 size={28} className="spin" /></div> : users.length === 0 ? (
        <div className="empty-state"><Users size={36} /><p>No accounts found</p></div>
      ) : (
        <div className="admin-table">
          {users.map(user => (
            <div key={user.id} className="admin-row admin-user-row">
              <div className="admin-row-main">
                <div className="avatar-sm">{user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <strong>{user.full_name || "No name"}</strong>
                  <small>{user.email || "No auth email"} · {user.role.replace("_", " ")}</small>
                  <small>Joined {new Date(user.created_at).toLocaleDateString()} · Last login {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}</small>
                </div>
              </div>
              <div className="admin-row-badges">
                {user.is_verified ? <span className="badge badge-success sm"><ShieldCheck size={11} /> Verified</span> : null}
                {user.is_admin ? <span className="badge badge-pending sm"><Shield size={11} /> Admin</span> : null}
                {user.is_super_admin ? <span className="badge badge-super sm"><Crown size={11} /> Super admin</span> : null}
                {user.is_suspended ? <span className="badge badge-error sm"><Ban size={11} /> Suspended</span> : null}
              </div>
              <div className="admin-account-actions">
                <button className="button button-small button-outline" onClick={() => accountAction(user.id, user.is_verified ? "unverify" : "verify")} disabled={Boolean(processing)}>{user.is_verified ? "Unverify" : "Verify"}</button>
                {viewer?.is_super_admin && user.id !== viewer.id ? (
                  <>
                    <button className="button button-small button-outline" onClick={() => accountAction(user.id, user.is_admin ? "revoke_admin" : "grant_admin")} disabled={Boolean(processing)}>{user.is_admin ? "Remove admin" : "Make admin"}</button>
                    {user.is_admin ? <button className="button button-small button-outline" onClick={() => accountAction(user.id, user.is_super_admin ? "revoke_super_admin" : "grant_super_admin")} disabled={Boolean(processing)}>{user.is_super_admin ? "Remove super" : "Make super"}</button> : null}
                    <button className="icon-btn" title={user.is_suspended ? "Restore account" : "Suspend account"} onClick={() => accountAction(user.id, user.is_suspended ? "restore" : "suspend")} disabled={Boolean(processing)}>{user.is_suspended ? <RotateCcw size={15} /> : <Ban size={15} />}</button>
                    <button className="icon-btn danger" title="Delete account" onClick={() => accountAction(user.id, "delete")} disabled={Boolean(processing)}><Trash2 size={15} /></button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
