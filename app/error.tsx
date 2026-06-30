"use client";

import { useEffect } from "react";
import { Sparkles, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <main style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fbfc", color: "#12243b", padding: "20px" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", maxWidth: "480px", padding: "40px", background: "white", borderRadius: "24px", boxShadow: "0 22px 70px rgba(35, 87, 116, .08)", border: "1px solid #dce8ee" }}>
        <div className="logo" style={{ color: "#12243b", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "22px", fontWeight: 700 }}>
          <span className="logo-mark" style={{ display: "grid", placeItems: "center", width: "34px", height: "34px", marginRight: "4px", color: "white", borderRadius: "50% 50% 50% 15%", background: "linear-gradient(145deg, #31b7b5, #2789d8)", transform: "rotate(-10deg)" }}>
            <Sparkles size={19} strokeWidth={2.4} style={{ transform: "rotate(10deg)" }} />
          </span>
          <span>Twinkle</span><strong style={{ color: "#31b7b5" }}>Go</strong>
        </div>
        <h1 style={{ fontSize: "32px", margin: "10px 0 0", color: "#ff785f", fontWeight: 800, letterSpacing: "-1.5px" }}>Something went wrong!</h1>
        <p style={{ color: "#526174", fontSize: "14px", lineHeight: "1.7", margin: "0 0 20px" }}>
          An unexpected error occurred while loading this page. Our team has been notified.
        </p>
        <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            className="button"
            style={{ minHeight: "44px", textDecoration: "none", cursor: "pointer" }}
          >
            <RefreshCw size={15} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="button"
            style={{ minHeight: "44px", textDecoration: "none", background: "#12243b", boxShadow: "none" }}
          >
            <Home size={15} /> Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
