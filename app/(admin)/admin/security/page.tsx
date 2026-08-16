import { KeyRound } from "lucide-react";
import ChangePasswordForm from "@/components/change-password-form";

export default function AdminSecurityPage() {
  return (
    <div className="dash-page">
      <div className="dash-page-head admin-page-heading">
        <div><span className="admin-kicker">Access control</span><h1><KeyRound size={26} /> Password & security</h1><p>Protect the account that controls TwinkleGo operations.</p></div>
      </div>
      <ChangePasswordForm admin />
    </div>
  );
}
