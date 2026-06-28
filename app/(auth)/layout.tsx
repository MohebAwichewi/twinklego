import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <a className="logo" href="/">
          <span className="logo-mark" aria-hidden="true"><Sparkles size={19} strokeWidth={2.4} /></span>
          <span>Twinkle</span><strong>Go</strong>
        </a>
        <div className="auth-hero-text">
          <h2>Trusted help,<br />right around the corner.</h2>
          <p>Join thousands of people earning and getting help in their community.</p>
        </div>
        <div className="auth-decor">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
        </div>
      </div>
      <div className="auth-right">
        {children}
      </div>
    </div>
  );
}
