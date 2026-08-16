import { KeyRound } from "lucide-react";
import ChangePasswordForm from "@/components/change-password-form";

export default function ProfileSecurityPage() {
  return (
    <div className="dash-page">
      <div className="dash-page-head">
        <div><h1><KeyRound size={25} /> Password & security</h1><p>Update the password used to access your TwinkleGo account.</p></div>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
