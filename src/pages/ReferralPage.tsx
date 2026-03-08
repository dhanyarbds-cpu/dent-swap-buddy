import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Copy, Share2, Users, CheckCircle2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ReferralPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [freeListingsLeft, setFreeListingsLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: existing } = await supabase.from("referrals").select("*").eq("referrer_id", user.id);

      if (existing && existing.length > 0) {
        setReferralCode(existing[0].referral_code);
        setReferrals(existing);
      } else {
        const code = `DENT${user.id.slice(0, 6).toUpperCase()}`;
        await supabase.from("referrals").insert({ referrer_id: user.id, referral_code: code });
        setReferralCode(code);
      }

      // Calculate free commission-free listings: 2 per completed referral
      const { data: credits } = await supabase.from("user_credits").select("amount").eq("user_id", user.id);
      setFreeListingsLeft((credits || []).reduce((sum: number, c: any) => sum + c.amount, 0));
      setLoading(false);
    };
    init();
  }, [user]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const shareCode = () => {
    const text = `Join DentSwap - the marketplace for dental students! Use my referral code ${referralCode} and we both get 2 commission-free sales. Download now!`;
    if (navigator.share) {
      navigator.share({ title: "Join DentSwap", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Share text copied!");
    }
  };

  const completedReferrals = referrals.filter(r => r.status === "completed" || r.status === "credited").length;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass-panel border-b border-border">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Refer & Earn</h1>
            <p className="text-xs text-muted-foreground">Invite friends, sell commission-free</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-5 text-center">
              <div className="text-4xl mb-3">🎁</div>
              <h2 className="text-lg font-bold text-foreground">Invite Friends & Sell Free</h2>
              <p className="text-sm text-muted-foreground mt-1">Both you and your friend get <span className="font-bold text-primary">2 commission-free product sales</span> when they join!</p>
            </div>

            {/* Referral code */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Your Referral Code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-secondary/80 border border-border px-4 py-3 text-center">
                    <span className="text-lg font-bold tracking-widest text-foreground">{referralCode}</span>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} className="h-12 w-12 rounded-xl">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={shareCode} className="w-full mt-3 gap-2">
                  <Share2 className="h-4 w-4" />Share Invite
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="glass-card">
                <CardContent className="p-3 text-center">
                  <Users className="mx-auto h-5 w-5 text-primary mb-1" />
                  <p className="text-lg font-bold">{referrals.length}</p>
                  <p className="text-[10px] text-muted-foreground">Invites Sent</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500 mb-1" />
                  <p className="text-lg font-bold">{completedReferrals}</p>
                  <p className="text-[10px] text-muted-foreground">Joined</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 text-center">
                  <Package className="mx-auto h-5 w-5 text-primary mb-1" />
                  <p className="text-lg font-bold">{freeListingsLeft}</p>
                  <p className="text-[10px] text-muted-foreground">Free Sales Left</p>
                </CardContent>
              </Card>
            </div>

            {/* How it works */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold mb-3">How It Works</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", text: "Share your referral code with friends" },
                    { step: "2", text: "Friend signs up using your code" },
                    { step: "3", text: "Both of you get 2 commission-free product sales (0% platform fee)" },
                  ].map(s => (
                    <div key={s.step} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{s.step}</div>
                      <p className="text-sm text-muted-foreground">{s.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default ReferralPage;
