import Image from "next/image";
import { BadgeCheck, MapPin, ShieldCheck, Sparkles } from "lucide-react";

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
          <div className="auth-trust-preview">
            <Image src="/images/verified-runner-kunle.webp" alt="Verified TwinkleGo runner" width={64} height={64} />
            <div><strong>Kunle is nearby</strong><span><BadgeCheck size={13} /> ID verified · 4.9 rating</span><small><MapPin size={12} /> 8 minutes away</small></div>
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
