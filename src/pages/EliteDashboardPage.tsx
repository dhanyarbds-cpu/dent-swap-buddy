import { useState, useEffect } from "react";
import { ArrowLeft, Crown, Search, Bell, Trash2, Plus, Sparkles, X, Eye, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/mockData";

interface DemandAlert {
  id: string;
  keywords: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface EliteNotification {
  id: string;
  demand_alert_id: string | null;
  listing_id: string;
  title: string;
  message: string;
  is_read: boolean;
  match_score: number;
  created_at: string;
  listing?: { title: string; price: number; images: string[] | null; category: string } | null;
}

type Tab = "alerts" | "tracked" | "history";

const EliteDashboardPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("alerts");
  const [demands, setDemands] = useState<DemandAlert[]>([]);
  const [notifications, setNotifications] = useState<EliteNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeywords, setNewKeywords] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const isElite = profile?.is_elite;

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [demandsRes, notifsRes] = await Promise.all([
      supabase.from("demand_alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("elite_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);

    setDemands((demandsRes.data as DemandAlert[]) || []);

    // Enrich notifications with listing data
    const notifs = (notifsRes.data || []) as EliteNotification[];
    if (notifs.length > 0) {
      const listingIds = [...new Set(notifs.map((n) => n.listing_id))];
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, price, images, category")
        .in("id", listingIds);

      const listingMap = new Map((listings || []).map((l) => [l.id, l]));
      for (const n of notifs) {
        n.listing = listingMap.get(n.listing_id) || null;
      }
    }

    setNotifications(notifs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Realtime notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("elite-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "elite_notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as EliteNotification;
        setNotifications((prev) => [newNotif, ...prev]);
        toast({ title: newNotif.title, description: newNotif.message });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addDemand = async () => {
    if (!user || !newKeywords.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("demand_alerts").insert({
      user_id: user.id,
      keywords: newKeywords.trim(),
      category: newCategory.trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Search tracked ✓", description: "You'll be notified when matching products appear." });
      setNewKeywords("");
      setNewCategory("");
      fetchData();
    }
    setAdding(false);
  };

  const removeDemand = async (id: string) => {
    await supabase.from("demand_alerts").delete().eq("id", id);
    setDemands((prev) => prev.filter((d) => d.id !== id));
  };

  const markRead = async (id: string) => {
    await supabase.from("elite_notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!isElite) {
    return (
      <div className="safe-bottom min-h-screen bg-background">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
          <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Elite Membership</h1>
        </header>

        <div className="flex flex-col items-center px-6 py-20 text-center animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl dentzap-gradient dentzap-shadow-lg">
            <Crown className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Unlock Elite Membership</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-[280px] leading-relaxed">
            Get early alerts when products you want become available. Elite members discover products before anyone else.
          </p>

          <div className="mt-8 w-full max-w-sm space-y-3">
            {[
              { icon: Sparkles, text: "AI-powered product matching" },
              { icon: Bell, text: "Instant notifications for new listings" },
              { icon: Eye, text: "Early access before other buyers" },
              { icon: TrendingUp, text: "Priority search placement" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 dentzap-card-shadow">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          <Button className="mt-8 w-full max-w-sm gap-2 dentzap-gradient rounded-xl py-5 text-sm font-bold text-primary-foreground dentzap-shadow">
            <Crown className="h-4 w-4" />
            Upgrade to Elite · ₹99/month
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Elite Dashboard</h1>
              <Crown className="h-4 w-4 text-primary" />
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {([
            { key: "alerts" as Tab, label: "Alerts", count: unreadCount },
            { key: "tracked" as Tab, label: "Tracked" },
            { key: "history" as Tab, label: "History" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[9px]">
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {/* Alerts Tab */}
        {tab === "alerts" && (
          <div className="space-y-3 animate-fade-in">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-card p-4 dentzap-card-shadow">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 skeleton rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 skeleton" />
                      <div className="h-2.5 w-48 skeleton" />
                    </div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="mt-4 font-semibold text-foreground">No alerts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Track products to receive alerts</p>
              </div>
            ) : (
              notifications.map((notif, i) => (
                <button
                  key={notif.id}
                  onClick={() => { markRead(notif.id); }}
                  className={`w-full rounded-2xl border p-4 text-left transition-all animate-fade-in dentzap-card-shadow ${
                    notif.is_read
                      ? "border-border bg-card"
                      : "border-primary/20 bg-primary/5"
                  }`}
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <div className="flex gap-3">
                    {notif.listing?.images?.[0] ? (
                      <img src={notif.listing.images[0]} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-xl">🦷</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{notif.title}</p>
                        {!notif.is_read && <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {notif.listing && (
                          <span className="text-xs font-bold text-primary">{formatPrice(notif.listing.price)}</span>
                        )}
                        <span className="rounded-full bg-verified/10 px-2 py-0.5 text-[9px] font-semibold text-verified">
                          {Math.round((notif.match_score || 0) * 100)}% match
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Tracked Tab */}
        {tab === "tracked" && (
          <div className="space-y-4 animate-fade-in">
            {/* Add new tracking */}
            <div className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow space-y-3">
              <p className="text-sm font-bold text-foreground">Track a Product</p>
              <Input
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="e.g. Dental handpiece NSK"
                className="rounded-xl py-5"
              />
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category (optional)"
                className="rounded-xl py-5"
              />
              <Button
                onClick={addDemand}
                disabled={!newKeywords.trim() || adding}
                className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {adding ? "Adding..." : "Track This Search"}
              </Button>
            </div>

            {/* Existing tracked searches */}
            {demands.filter((d) => d.is_active).length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">No tracked searches</p>
                <p className="mt-1 text-xs text-muted-foreground">Add products you're looking for above</p>
              </div>
            ) : (
              demands.filter((d) => d.is_active).map((demand, i) => (
                <div
                  key={demand.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 dentzap-card-shadow animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{demand.keywords}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {demand.category && (
                        <span className="text-[10px] text-muted-foreground">{demand.category}</span>
                      )}
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(demand.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDemand(demand.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === "history" && (
          <div className="space-y-3 animate-fade-in">
            {notifications.filter((n) => n.is_read).length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">No notification history</p>
              </div>
            ) : (
              notifications.filter((n) => n.is_read).map((notif) => (
                <div key={notif.id} className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow opacity-70">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{notif.message}</p>
                  <span className="mt-1 inline-block text-[10px] text-muted-foreground">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default EliteDashboardPage;
