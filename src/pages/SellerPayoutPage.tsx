import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, CheckCircle, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [status, setStatus] = useState<{
    connected: boolean;
    onboarding_complete: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
  } | null>(null);

  const checkStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error("Failed to check status:", err);
      setStatus({ connected: false, onboarding_complete: false });
    }
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, [user]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get("onboarding") === "complete") {
      toast({ title: "Checking status...", description: "Verifying your Stripe account setup." });
      checkStatus();
    }
  }, [searchParams]);

  const handleConnect = async () => {
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

  const isFullySetup = status?.connected && status?.onboarding_complete;

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
        {/* Status Card */}
        {isFullySetup ? (
          <div className="rounded-2xl border border-verified/20 bg-verified/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-verified/10">
                <CheckCircle className="h-6 w-6 text-verified" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Payment Setup Complete</p>
                <p className="text-xs text-muted-foreground">You can receive payments from buyers</p>
              </div>
            </div>

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
          </div>
        ) : status?.connected ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Setup Incomplete</p>
                <p className="text-xs text-muted-foreground">Complete your Stripe onboarding to start receiving payments</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Setup Required</p>
                <p className="text-xs text-muted-foreground">Connect your Stripe account to receive payments from sales</p>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">How Payments Work</p>
          <div className="space-y-3">
            {[
              { step: "1", title: "Buyer pays via Stripe", desc: "Cards, UPI, and more — all handled securely" },
              { step: "2", title: "Platform holds payment", desc: "Funds are held until buyer confirms delivery" },
              { step: "3", title: "You get paid automatically", desc: "After delivery confirmation, funds transfer to your Stripe account (minus 1% platform fee)" },
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

        {/* Action Button */}
        {isFullySetup ? (
          <Button
            onClick={handleConnect}
            variant="outline"
            disabled={connecting}
            className="w-full rounded-xl py-5 text-sm font-semibold gap-2"
          >
            <ExternalLink className="h-4 w-4" /> Update Account Details
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow"
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

        <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your financial data is handled securely by Stripe. DentSwap never stores your bank details.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SellerPayoutPage;
