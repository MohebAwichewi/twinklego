import {
  BadgeCheck,
  Banknote,
  Bike,
  MapPin,
  Navigation,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

const appStickers = [
  { className: "sticker-route", label: "Nearby", icon: Navigation },
  { className: "sticker-package", label: "Handled", icon: PackageCheck },
  { className: "sticker-trust", label: "Verified", icon: ShieldCheck },
  { className: "sticker-earn", label: "Earn", icon: Banknote },
  { className: "sticker-runner", label: "On the go", icon: Bike },
  { className: "sticker-store", label: "Quick run", icon: ShoppingBag },
];

const adminStickers = [
  { className: "sticker-route", label: "Live ops", icon: Navigation },
  { className: "sticker-package", label: "Tasks", icon: PackageCheck },
  { className: "sticker-trust", label: "Trust", icon: BadgeCheck },
  { className: "sticker-earn", label: "Payouts", icon: Banknote },
];

export default function TwinkleStickers({ variant = "app" }: { variant?: "app" | "admin" }) {
  const stickers = variant === "admin" ? adminStickers : appStickers;

  return (
    <div className={`twinkle-stickers twinkle-stickers-${variant}`} aria-hidden="true">
      <span className="sticker-spark sticker-spark-one"><Sparkles size={22} /></span>
      <span className="sticker-spark sticker-spark-two"><Sparkles size={15} /></span>
      <span className="sticker-pin"><MapPin size={22} /></span>
      {stickers.map(({ className, label, icon: Icon }) => (
        <span key={className} className={`twinkle-sticker ${className}`}>
          <span className="twinkle-sticker-icon"><Icon size={20} strokeWidth={2.4} /></span>
          <b>{label}</b>
        </span>
      ))}
      <span className="sticker-route-dots"><i /><i /><i /><i /></span>
    </div>
  );
}
