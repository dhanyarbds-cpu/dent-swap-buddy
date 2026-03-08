import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, CheckCircle, ExternalLink, ShieldCheck, AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const SellerPayoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [savedUpiId, setSavedUpiId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    connected: boolean;
    onboarding_complete: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
  } | null>(null);

  const checkStatus = async () => {
    if (!user) return;
    try {
      // Check Stripe status
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error("Failed to check status:", err);
      setStatus({ connected: false, onboarding_complete: false });
    }

    // Check saved UPI
    try {
      const { data: payoutData } = await supabase
        .from("seller_payout_details")
        .select("upi_id")
        .eq("seller_id", user.id)
        .single();
      if (payoutData?.upi_id) {
        setSavedUpiId(payoutData.upi_id);
        setUpiId(payoutData.upi_id);
      }
    } catch {}

    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "complete") {
      toast({ title: "Checking status...", description: "Verifying your Stripe account setup." });
      checkStatus();
    }
  }, [searchParams]);

  const handleSaveUpi = async () => {
    if (!user) return;
    const trimmed = upiId.trim();
    if (!trimmed || !/^[\w.\-]+@[\w]+$/.test(trimmed)) {
      toast({ title: "Invalid UPI ID", description: "Please enter a valid UPI ID (e.g. name@upi)", variant: "destructive" });
      return;
    }
    setSavingUpi(true);
    try {
      const { data: existing } = await supabase
        .from("seller_payout_details")
        .select("id")
        .eq("seller_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("seller_payout_details")
          .update({ upi_id: trimmed, payout_method: "upi" })
          .eq("seller_id", user.id);
      } else {
        await supabase
          .from("seller_payout_details")
          .insert({ seller_id: user.id, upi_id: trimmed, payout_method: "upi" });
      }
      setSavedUpiId(trimmed);
      toast({ title: "UPI ID saved!", description: "Your payout details have been registered." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingUpi(false);
  };

  const handleConnect = async () => {
    if (!savedUpiId) {
      toast({ title: "UPI Required", description: "Please register your UPI ID first before connecting Stripe.", variant: "destructive" });
      return;
    }
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFullySetup = status?.connected && status?.onboarding_complete && savedUpiId;

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Payment Setup</h1>
        {isFullySetup && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-verified">
            <CheckCircle className="h-3 w-3" /> Active
          </span>
        )}
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-5 animate-fade-in">
        {/* Step 1: UPI Registration (Mandatory) */}
        <div className={`rounded-2xl border p-5 space-y-3 ${savedUpiId ? "border-verified/20 bg-verified/5" : "border-primary/20 bg-primary/5"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${savedUpiId ? "bg-verified/10" : "bg-primary/10"}`}>
              {savedUpiId ? <CheckCircle className="h-6 w-6 text-verified" /> : <Wallet className="h-6 w-6 text-primary" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                <p className="text-base font-bold text-foreground">Register UPI ID</p>
                <span className="text-[9px] font-bold uppercase tracking-widest text-destructive">Required</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {savedUpiId ? `Registered: ${savedUpiId}` : "Enter your UPI ID to receive payouts"}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Label htmlFor="upi" className="text-xs font-semibold text-muted-foreground">UPI ID</Label>
            <Input
              id="upi"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="rounded-xl"
            />
            <Button
              onClick={handleSaveUpi}
              disabled={savingUpi || !upiId.trim()}
              className="w-full rounded-xl py-4 text-sm font-semibold dentzap-gradient text-primary-foreground dentzap-shadow"
            >
              {savingUpi ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : savedUpiId ? "Update UPI ID" : "Save UPI ID"}
            </Button>
          </div>
        </div>

        {/* Step 2: Stripe Connect */}
        <div className={`rounded-2xl border p-5 space-y-3 transition-opacity ${!savedUpiId ? "opacity-50 pointer-events-none" : ""} ${
          isFullySetup ? "border-verified/20 bg-verified/5" : status?.connected ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-card"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isFullySetup ? "bg-verified/10" : status?.connected ? "bg-amber-500/10" : "bg-secondary"
            }`}>
              {isFullySetup ? <CheckCircle className="h-6 w-6 text-verified" /> : status?.connected ? <AlertTriangle className="h-6 w-6 text-amber-500" /> : <ShieldCheck className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                <p className="text-base font-bold text-foreground">
                  {isFullySetup ? "Stripe Connected" : status?.connected ? "Complete Onboarding" : "Connect Stripe"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFullySetup ? "You can receive card & UPI payments via Stripe" : "Connect your Stripe account to accept payments"}
              </p>
            </div>
          </div>

          {isFullySetup ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-background/50 px-3 py-2.5 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Charges</p>
                <p className="mt-0.5 text-sm font-bold text-verified">✓ Enabled</p>
              </div>
              <div className="rounded-xl bg-background/50 px-3 py-2.5 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Payouts</p>
                <p className="mt-0.5 text-sm font-bold text-verified">✓ Enabled</p>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={connecting || !savedUpiId}
              variant={status?.connected ? "outline" : "default"}
              className="w-full rounded-xl py-4 text-sm font-semibold gap-2"
            >
              {connecting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</>
              ) : status?.connected ? (
                <><ExternalLink className="h-4 w-4" /> Complete Stripe Onboarding</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Connect with Stripe</>
              )}
            </Button>
          )}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">How Payments Work</p>
          <div className="space-y-3">
            {[
              { step: "1", title: "Register your UPI ID", desc: "Required to open your seller account and receive payouts" },
              { step: "2", title: "Connect Stripe account", desc: "Enables card, UPI & other payment methods for buyers" },
              { step: "3", title: "Buyer pays securely", desc: "Payment held in escrow until delivery is confirmed" },
              { step: "4", title: "You get paid automatically", desc: "Funds transfer to your account minus 1% platform fee" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your financial data is handled securely. DentSwap never stores your bank details — UPI ID is used only for payout verification.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SellerPayoutPage;
