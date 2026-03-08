import { useEffect, useState } from "react";
import { ArrowLeft, Award, Trophy, Zap, Star, Shield, TrendingUp, Crown, Target, Flame, Gift, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_BADGES = [
  { type: "top_seller", name: "Top Seller", icon: "🏆", desc: "Complete 10+ sales with great ratings", xp: 500, color: "from-amber-500/20 to-amber-600/10 border-amber-500/30" },
  { type: "trusted_buyer", name: "Trusted Buyer", icon: "🛡️", desc: "Complete 5+ purchases with no disputes", xp: 300, color: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { type: "fast_responder", name: "Fast Responder", icon: "⚡", desc: "Respond to messages within 30 minutes", xp: 200, color: "from-purple-500/20 to-purple-600/10 border-purple-500/30" },
  { type: "first_sale", name: "First Sale", icon: "🎉", desc: "Make your first successful sale", xp: 100, color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
  { type: "power_lister", name: "Power Lister", icon: "📦", desc: "List 20+ active products", xp: 400, color: "from-rose-500/20 to-rose-600/10 border-rose-500/30" },
  { type: "verified_seller", name: "Verified Seller", icon: "✅", desc: "Complete identity verification", xp: 250, color: "from-green-500/20 to-green-600/10 border-green-500/30" },
  { type: "community_star", name: "Community Star", icon: "⭐", desc: "Write 10+ helpful reviews", xp: 350, color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30" },
  { type: "referral_champion", name: "Referral Champion", icon: "🤝", desc: "Refer 5+ friends who join", xp: 450, color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30" },
];

const LEVELS = [
  { level: 1, name: "Newcomer", minXp: 0, icon: "🌱" },
  { level: 2, name: "Explorer", minXp: 200, icon: "🔍" },
  { level: 3, name: "Contributor", minXp: 500, icon: "🌟" },
  { level: 4, name: "Expert", minXp: 1000, icon: "💎" },
  { level: 5, name: "Champion", minXp: 1800, icon: "👑" },
  { level: 6, name: "Legend", minXp: 3000, icon: "🔥" },
];

const XP_ACTIONS = [
  { action: "List a product", xp: 20, icon: "📦" },
  { action: "Complete a sale", xp: 50, icon: "💰" },
  { action: "Write a review", xp: 15, icon: "⭐" },
  { action: "Refer a friend", xp: 80, icon: "🤝" },
  { action: "Verify your identity", xp: 100, icon: "✅" },
  { action: "Make a purchase", xp: 30, icon: "🛒" },
];

const REWARDS = [
  { name: "Priority Listing", xpRequired: 300, icon: "🚀", desc: "Your listings appear higher in search" },
  { name: "Discount Coupon ₹50", xpRequired: 500, icon: "🎟️", desc: "Get ₹50 off on platform fees" },
  { name: "Elite Trial - 7 Days", xpRequired: 1000, icon: "👑", desc: "Free 7-day Elite membership" },
  { name: "Exclusive Badge Frame", xpRequired: 1500, icon: "🖼️", desc: "Custom profile badge frame" },
  { name: "VIP Early Access", xpRequired: 2500, icon: "🔑", desc: "Access new features before everyone" },
];

function getLevel(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
    else break;
  }
  const nextLevel = LEVELS.find(l => l.minXp > xp);
  const progressToNext = nextLevel
    ? ((xp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100
    : 100;
  return { ...current, nextLevel, progressToNext, xp };
}

const BadgesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState({ listings: 0, sales: 0, reviews: 0, referrals: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [badgesRes, listingsRes, salesRes, reviewsRes, referralsRes] = await Promise.all([
        supabase.from("user_badges").select("badge_type").eq("user_id", user.id),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewer_id", user.id),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id).eq("status", "completed"),
      ]);
      setEarnedBadges((badgesRes.data || []).map((b: any) => b.badge_type));
      setStats({
        listings: listingsRes.count || 0,
        sales: salesRes.count || 0,
        reviews: reviewsRes.count || 0,
        referrals: referralsRes.count || 0,
      });

      // Leaderboard: top sellers by completed sales
      const { data: topSellers } = await supabase
        .from("orders")
        .select("seller_id")
        .eq("status", "completed");

      if (topSellers) {
        const counts: Record<string, number> = {};
        topSellers.forEach((o: any) => { counts[o.seller_id] = (counts[o.seller_id] || 0) + 1; });
        const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10);
        
        const sellerIds = sorted.map(([id]) => id);
        if (sellerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, college")
            .in("user_id", sellerIds);

          const board = sorted.map(([id, count], i) => {
            const profile = profiles?.find((p: any) => p.user_id === id);
            return {
              rank: i + 1,
              userId: id,
              name: profile?.full_name || "User",
              avatar: profile?.avatar_url,
              college: profile?.college || "",
              sales: count,
              isYou: id === user.id,
            };
          });
          setLeaderboard(board);
        }
      }

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  // Calculate XP
  const totalXp = (stats.listings * 20) + (stats.sales * 50) + (stats.reviews * 15) + (stats.referrals * 80) +
    earnedBadges.reduce((sum, type) => {
      const badge = ALL_BADGES.find(b => b.type === type);
      return sum + (badge?.xp || 0);
    }, 0);

  const levelInfo = getLevel(totalXp);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Achievements
            </h1>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{totalXp} XP</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Level Card */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-5">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Crown className="h-24 w-24 text-primary" />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
              {levelInfo.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-foreground">Level {levelInfo.level}</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{levelInfo.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{totalXp} XP total</p>
              {levelInfo.nextLevel && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Next: {levelInfo.nextLevel.icon} {levelInfo.nextLevel.name}</span>
                    <span className="text-[10px] font-semibold text-primary">{levelInfo.nextLevel.minXp - totalXp} XP to go</span>
                  </div>
                  <Progress value={levelInfo.progressToNext} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Listed", value: stats.listings, icon: "📦" },
            { label: "Sales", value: stats.sales, icon: "💰" },
            { label: "Reviews", value: stats.reviews, icon: "⭐" },
            { label: "Referrals", value: stats.referrals, icon: "🤝" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <span className="text-lg">{s.icon}</span>
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="badges" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="badges" className="text-xs">Badges</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs">Leaderboard</TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs">Rewards</TabsTrigger>
            <TabsTrigger value="xp" className="text-xs">Earn XP</TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{earnedBadges.length}/{ALL_BADGES.length} Earned</span>
              <span className="text-xs text-muted-foreground">+{earnedBadges.reduce((s, t) => s + (ALL_BADGES.find(b => b.type === t)?.xp || 0), 0)} XP from badges</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ALL_BADGES.map(badge => {
                const earned = earnedBadges.includes(badge.type);
                return (
                  <Card key={badge.type} className={`relative overflow-hidden border transition-all ${
                    earned ? `bg-gradient-to-br ${badge.color}` : "bg-card opacity-50 grayscale"
                  }`}>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl mb-1.5">{badge.icon}</div>
                      <p className="text-xs font-bold text-foreground">{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{badge.desc}</p>
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <Zap className="h-2.5 w-2.5 text-primary" />
                        <span className="text-[10px] font-bold text-primary">+{badge.xp} XP</span>
                      </div>
                      {earned && (
                        <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Earned ✓</span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Medal className="h-4 w-4 text-primary" /> Top Sellers
            </p>
            {leaderboard.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No sales yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                      entry.isYou ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                    } ${entry.rank <= 3 ? "ring-1 ring-primary/10" : ""}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                      entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
                      entry.rank === 2 ? "bg-slate-400/20 text-slate-500" :
                      entry.rank === 3 ? "bg-orange-400/20 text-orange-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        entry.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.name} {entry.isYou && <span className="text-[10px] text-primary">(You)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{entry.college}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{entry.sales}</p>
                      <p className="text-[10px] text-muted-foreground">sales</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Unlock Rewards
            </p>
            <div className="space-y-3">
              {REWARDS.map((reward) => {
                const unlocked = totalXp >= reward.xpRequired;
                const progress = Math.min((totalXp / reward.xpRequired) * 100, 100);
                return (
                  <div key={reward.name} className={`rounded-xl border p-4 transition ${
                    unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reward.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{reward.name}</p>
                        <p className="text-[10px] text-muted-foreground">{reward.desc}</p>
                      </div>
                      {unlocked ? (
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary">Unlocked ✓</span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{reward.xpRequired} XP</span>
                      )}
                    </div>
                    {!unlocked && (
                      <div className="mt-2">
                        <Progress value={progress} className="h-1.5" />
                        <p className="mt-1 text-[10px] text-muted-foreground text-right">{reward.xpRequired - totalXp} XP remaining</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Earn XP Tab */}
          <TabsContent value="xp" className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" /> Ways to Earn XP
            </p>
            <div className="space-y-2">
              {XP_ACTIONS.map(action => (
                <div key={action.action} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="text-xl">{action.icon}</span>
                  <p className="flex-1 text-sm font-medium text-foreground">{action.action}</p>
                  <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-bold text-primary">+{action.xp}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BadgesPage;
