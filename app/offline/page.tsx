import Link from "next/link";
import { RefreshCw, Sparkles, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <span className="offline-mark"><Sparkles size={24} /></span>
      <WifiOff size={40} />
      <h1>You&apos;re offline</h1>
      <p>TwinkleGo needs a connection for live tasks, location updates, verification, and payments.</p>
      <Link href="/dashboard" className="button"><RefreshCw size={16} /> Try again</Link>
    </main>
  );
}
