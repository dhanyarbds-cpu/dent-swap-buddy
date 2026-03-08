import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Phone, BadgeCheck, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

const VerificationPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailVerified = !!user?.email_confirmed_at;
  const phoneNumber = profile?.phone || "";

  const [phoneInput, setPhoneInput] = useState(phoneNumber);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!phoneInput.trim() || phoneInput.length < 10) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }

    setSendingOtp(true);
    try {
      const formattedPhone = phoneInput.startsWith("+91") ? phoneInput : `+91${phoneInput.replace(/\D/g, "")}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setOtpSent(true);
      setCooldown(60);
      toast({ title: "OTP Sent ✓", description: `Verification code sent to ${formattedPhone}` });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;

    setVerifyingOtp(true);
    try {
      const formattedPhone = phoneInput.startsWith("+91") ? phoneInput : `+91${phoneInput.replace(/\D/g, "")}`;
      
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      // Update profile phone
      await supabase.from("profiles").update({ phone: formattedPhone, verified: true }).eq("user_id", user!.id);
      
      setPhoneVerified(true);
      await refreshProfile();
      toast({ title: "Phone Verified ✓", description: "Your phone number has been verified." });
    } catch (err: any) {
      toast({ title: "Invalid OTP", description: err.message, variant: "destructive" });
    }
    setVerifyingOtp(false);
  };

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
      desc: phoneVerified ? phoneInput : (phoneNumber || "Not added"),
      verified: phoneVerified || profile?.verified,
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

        {/* Phone OTP Section */}
        {!phoneVerified && !profile?.verified && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4 dentzap-card-shadow">
            <h3 className="text-sm font-bold text-foreground">Verify Phone Number</h3>
            
            {!otpSent ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">+91</span>
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 rounded-xl"
                    maxLength={10}
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={sendingOtp || phoneInput.length < 10}
                  className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
                >
                  {sendingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send OTP"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to +91{phoneInput}</p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otp.length < 6}
                  className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
                >
                  {verifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify OTP"}
                </Button>
                <button
                  onClick={handleSendOtp}
                  disabled={cooldown > 0 || sendingOtp}
                  className="w-full text-center text-xs text-primary font-medium disabled:text-muted-foreground"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Verify your email and phone to earn the verified badge on your profile and listings. 
          Verified sellers get higher visibility in search results.
        </p>
      </main>
    </div>
  );
};

export default VerificationPage;
