import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="dash-loading" style={{ height: "60vh" }}>
      <Loader2 size={32} className="spin" style={{ color: "var(--blue)" }} />
      <p style={{ color: "var(--body)", fontSize: "14px", fontWeight: 600 }}>Loading...</p>
    </div>
  );
}
