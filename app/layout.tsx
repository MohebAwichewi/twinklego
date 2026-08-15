import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./app.css";
import PwaRegister from "@/components/pwa-register";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "TwinkleGo | Trusted help nearby",
  description:
    "Busy people need help. Other people need income. TwinkleGo connects them safely.",
  manifest: "/manifest.webmanifest",
  applicationName: "TwinkleGo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TwinkleGo" },
  icons: { icon: "/icon.svg", apple: "/icons/twinklego-192.png" },
};

export const viewport: Viewport = { themeColor: "#2789d8", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={jakarta.variable}>{children}<PwaRegister /></body>
    </html>
  );
}
