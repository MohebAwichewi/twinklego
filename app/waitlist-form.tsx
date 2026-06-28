"use client";

import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";

export function WaitlistForm() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), interest: form.get("interest") }),
    });
    const data = await response.json();
    setLoading(false);
    setStatus(response.ok ? "You’re on the list. We’ll be in touch!" : data.error);
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <div className="interest-picker">
        <label><input defaultChecked name="interest" type="radio" value="help" /><span>I need help</span></label>
        <label><input name="interest" type="radio" value="earn" /><span>I want to earn</span></label>
      </div>
      <div className="email-row">
        <input aria-label="Email address" name="email" placeholder="Enter your email address" required type="email" />
        <button className="button" disabled={loading} type="submit">{loading ? "Joining..." : "Join the waitlist"} <ArrowRight size={17} /></button>
      </div>
      {status ? <p className="form-status" role="status">{status}</p> : null}
    </form>
  );
}
