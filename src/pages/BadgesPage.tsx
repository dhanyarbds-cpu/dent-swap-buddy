import { useEffect, useState } from "react";
import { ArrowLeft, Award, Trophy, Zap, ShoppingCart, Star, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const ALL_BADGES = [
  { type: "top_seller", name: "Top Seller", icon: "🏆", desc: "Complete 10+ sales with great ratings", color: "from-amber-500/20 to-amber-600/10 border-amber-500/30" },
  { type: "trusted_buyer", name: "Trusted Buyer", icon: "🛡️", desc: "Complete 5+ purchases with no disputes", color: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { type: "fast_responder", name: "Fast Responder", icon: "⚡", desc: "Respond to messages within 30 minutes", color: "from-purple-500/20 to-purple-600/10 border-purple-500/30" },
  { type: "first_sale", name: "First Sale", icon: "🎉", desc: "Make your first successful sale", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
  { type: "power_lister", name: "Power Lister", icon: "📦", desc: "List 20+ active products", color: "from-rose-500/20 to-rose-600/10 border-rose-500/30" },
  { type: "verified_seller", name: "Verified Seller", icon: "✅", desc: "Complete identity verification", color: "from-green-500/20 to-green-600/10 border-green-500/30" },
];

const BadgesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("user_badges").select("badge_type").eq("user_id", user.id);
      setEarnedBadges((data || []).map((b: any) => b.badge_type));
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass-panel border-b border-border">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Achievements</h1>
            <p className="text-xs text-muted-foreground">{earnedBadges.length}/{ALL_BADGES.length} earned</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-3">
        {/* Progress */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Your Progress</span>
            <span className="text-xs font-bold text-primary">{earnedBadges.length}/{ALL_BADGES.length}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(earnedBadges.length / ALL_BADGES.length) * 100}%` }} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {ALL_BADGES.map(badge => {
              const earned = earnedBadges.includes(badge.type);
              return (
                <Card key={badge.type} className={`relative overflow-hidden border transition-all ${
                  earned ? `bg-gradient-to-br ${badge.color}` : "glass-card opacity-60 grayscale"
                }`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="text-sm font-bold text-foreground">{badge.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{badge.desc}</p>
                    {earned && (
                      <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Earned ✓</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BadgesPage;
