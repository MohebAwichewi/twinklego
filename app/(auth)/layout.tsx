import { BadgeCheck, LocateFixed, ShieldCheck, Sparkles, Star } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <a className="logo" href="/">
          <span className="logo-mark" aria-hidden="true"><Sparkles size={19} strokeWidth={2.4} /></span>
          <span>Twinkle</span><strong>Go</strong>
        </a>
        <div className="auth-hero-text">
          <span className="auth-kicker"><ShieldCheck size={15} /> Built around trust</span>
          <h2>A little help can<br />change your whole day.</h2>
          <p>Request everyday help from verified people nearby, or earn on your own schedule.</p>
          <div className="auth-trust-preview auth-trust-list">
            <span><BadgeCheck size={18} /><b>Government ID review</b></span>
            <span><LocateFixed size={18} /><b>Live GPS task records</b></span>
            <span><Star size={18} /><b>Reviews from completed tasks</b></span>
          </div>
        </div>
        <p className="auth-promise"><ShieldCheck size={15} /> Identity checks, GPS records, ratings, and human support.</p>
      </div>
      <div className="auth-right">
        {children}
      </div>
    </div>
  );
}
