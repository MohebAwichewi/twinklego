import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0d2538", color: "white", padding: "20px" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", maxWidth: "480px", padding: "40px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "24px", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <div className="logo" style={{ color: "white", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "22px", fontWeight: 700 }}>
          <span className="logo-mark" style={{ display: "grid", placeItems: "center", width: "34px", height: "34px", marginRight: "4px", color: "white", borderRadius: "50% 50% 50% 15%", background: "linear-gradient(145deg, #31b7b5, #2789d8)", transform: "rotate(-10deg)" }}>
            <Sparkles size={19} strokeWidth={2.4} style={{ transform: "rotate(10deg)" }} />
          </span>
          <span>Twinkle</span><strong style={{ color: "#31b7b5" }}>Go</strong>
        </div>
        <h1 style={{ fontSize: "84px", margin: "10px 0 0", color: "#ff785f", fontWeight: 850, letterSpacing: "-4px" }}>404</h1>
        <h2 style={{ fontSize: "24px", margin: "0 0 10px", fontWeight: 700, letterSpacing: "-0.5px" }}>Lost in the stars?</h2>
        <p style={{ color: "#9bafbd", fontSize: "14px", lineHeight: "1.7", margin: "0 0 20px" }}>
          We couldn't find the page you're looking for. It might have been moved, deleted, or never existed in the first place.
        </p>
        <Link href="/" className="button" style={{ textDecoration: "none" }}>
          Go back home <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
