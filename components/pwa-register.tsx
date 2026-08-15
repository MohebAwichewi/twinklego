"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (!installPrompt || dismissed) return null;

  return (
    <aside className="pwa-install" aria-label="Install TwinkleGo">
      <span><Sparkles size={20} /></span>
      <div><strong>Keep TwinkleGo close</strong><small>Install the app for a faster, full-screen experience.</small></div>
      <button className="pwa-install-action" onClick={install}><Download size={15} /> Install</button>
      <button className="pwa-install-close" onClick={() => setDismissed(true)} aria-label="Dismiss install prompt"><X size={16} /></button>
    </aside>
  );
}
