import { ArrowLeft, Mail, Phone, BadgeCheck, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const VerificationPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const emailVerified = !!user?.email_confirmed_at;

  const verifications = [
    {
      icon: Mail,
      label: "Email Verification",
      desc: user?.email || "No email",
      verified: emailVerified,
    },
    {
      icon: Phone,
      label: "Phone Verification",
      desc: profile?.phone || "Not added",
      verified: false, // Phone OTP not implemented yet
    },
  ];

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Verification</h1>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-6">
        {/* Status Banner */}
        <div className={`rounded-2xl p-5 ${profile?.verified ? "bg-verified/10" : "bg-secondary"}`}>
          <div className="flex items-center gap-3">
            <BadgeCheck className={`h-8 w-8 ${profile?.verified ? "text-verified" : "text-muted-foreground"}`} />
            <div>
              <p className="text-base font-bold text-foreground">
                {profile?.verified ? "Verified Account" : "Not Verified"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.verified
                  ? "Your profile has the verified badge"
                  : "Complete verifications below to get the verified badge"}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Items */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
          {verifications.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-4 py-4 ${i < verifications.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.verified ? "bg-verified/10" : "bg-secondary"}`}>
                <item.icon className={`h-5 w-5 ${item.verified ? "text-verified" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              {item.verified ? (
                <CheckCircle className="h-5 w-5 text-verified" />
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">Pending</span>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Verify your email and phone to earn the verified badge on your profile and listings.
        </p>
      </main>
    </div>
  );
};

export default VerificationPage;
