"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, ShieldCheck, Shield, Search } from "lucide-react";
import { Profile } from "@/lib/types";

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers(q = "") {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function toggleVerified(id: string, current: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_verified: !current }),
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: !current } : u));
  }

  return (
    <div className="dash-page">
      <div className="dash-page-head"><div><h1><Users size={24} /> Users</h1><p>Manage all platform users</p></div></div>

      <div className="search-bar">
        <Search size={16} />
        <input
          placeholder="Search users by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchUsers(search)}
        />
      </div>

      {loading ? (
        <div className="dash-loading"><Loader2 size={28} className="spin" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><Users size={36} /><p>No users found</p></div>
      ) : (
        <div className="admin-table">
          {users.map(u => (
            <div key={u.id} className="admin-row">
              <div className="admin-row-main">
                <div className="avatar-sm">{u.full_name?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <strong>{u.full_name || "No name"}</strong>
                  <small>{u.role} · {u.phone || "No phone"} · Joined {new Date(u.created_at).toLocaleDateString()}</small>
                </div>
              </div>
              <div className="admin-row-badges">
                {u.is_verified && <span className="badge badge-success sm"><ShieldCheck size={11} /> Verified</span>}
                {u.is_admin && <span className="badge badge-pending sm"><Shield size={11} /> Admin</span>}
              </div>
              <button
                className={`button button-small ${u.is_verified ? "button-outline" : ""}`}
                onClick={() => toggleVerified(u.id, u.is_verified)}
              >
                {u.is_verified ? "Revoke" : "Verify"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
