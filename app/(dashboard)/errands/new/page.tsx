"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ErrandForm from "@/components/errand-form";
import { PlusCircle } from "lucide-react";

export default function NewErrandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: Record<string, unknown>) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/errands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to post errand");
      return;
    }
    const created = await res.json();
    router.push(`/errands/${created.id}`);
  }

  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div>
          <h1><PlusCircle size={24} /> Post an Errand</h1>
          <p>Tell us what you need and we&apos;ll connect you with a nearby runner</p>
        </div>
      </div>

      <div className="form-card">
        <ErrandForm onSubmit={handleSubmit} loading={loading} />
        {error && <div className="auth-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>
    </div>
  );
}
