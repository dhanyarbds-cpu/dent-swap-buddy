import { useState, useEffect } from "react";
import { ArrowLeft, Crown, Search, Bell, Trash2, Plus, Sparkles, X, Eye, TrendingUp, Clock, Check, AlertTriangle, Loader2, CalendarDays, Shield, Smartphone, CreditCard, Building2, Wallet, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/mockData";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const paymentMethods = [
  { id: "upi", label: "UPI", desc: "Google Pay, PhonePe, Paytm, Navi", icon: Smartphone },
  { id: "card", label: "Card", desc: "Debit / Credit Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", desc: "All major banks", icon: Building2 },
  { id: "wallet", label: "Wallets", desc: "PayPal, Freecharge, Mobikwik", icon: Wallet },
];
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

interface MembershipStatus {
  active: boolean;
  membership: any;
  daysLeft: number;
  expiringSoon: boolean;
  expired?: boolean;
}

type Tab = "alerts" | "tracked" | "history";

const EliteDashboardPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("alerts");
  const [demands, setDemands] = useState<DemandAlert[]>([]);
  const [notifications, setNotifications] = useState<EliteNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeywords, setNewKeywords] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const isElite = profile?.is_elite;

  // Check membership status
  useEffect(() => {
    if (!user) return;
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const { data, error } = await supabase.functions.invoke("elite-membership", {
          body: { action: "check_status" },
        });
        if (!error && data) {
          setMembershipStatus(data);
          if (data.expired) {
            await refreshProfile();
          }
          if (data.expiringSoon) {
            toast({
              title: "Membership Expiring Soon ⚠️",
              description: `Your Elite Membership expires in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}. Renew now to keep your benefits.`,
            });
          }
        }
      } catch {}
      setCheckingStatus(false);
    };
    checkStatus();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [demandsRes, notifsRes] = await Promise.all([
      supabase.from("demand_alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("elite_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setDemands((demandsRes.data as DemandAlert[]) || []);

    const notifs = (notifsRes.data || []) as EliteNotification[];
    if (notifs.length > 0) {
      const listingIds = [...new Set(notifs.map((n) => n.listing_id))];
      const { data: listings } = await supabase.from("listings").select("id, title, price, images, category").in("id", listingIds);
      const listingMap = new Map((listings || []).map((l) => [l.id, l]));
      for (const n of notifs) { n.listing = listingMap.get(n.listing_id) || null; }
    }
    setNotifications(notifs);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("elite-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "elite_notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const newNotif = payload.new as EliteNotification;
        setNotifications((prev) => [newNotif, ...prev]);
        toast({ title: newNotif.title, description: newNotif.message });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway");

      // Create Razorpay order for elite membership
      const { data, error } = await supabase.functions.invoke("create-elite-order", {
        body: { action: "create_razorpay_order" },
      });

      if (error || !data?.razorpay_order_id) {
        throw new Error(data?.error || error?.message || "Failed to create payment order");
      }

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: "DentSwap",
        description: "Elite Membership – 30 Days",
        order_id: data.razorpay_order_id,
        prefill: {
          email: user.email,
          name: profile?.full_name || "",
          contact: profile?.phone || "",
        },
        theme: { color: "#7C3AED" },
        method: {
          upi: selectedMethod === "upi",
          card: selectedMethod === "card",
          netbanking: selectedMethod === "netbanking",
          wallet: selectedMethod === "wallet",
          paylater: false,
        },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-elite-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || "Verification failed");
            }

            setPaymentSuccess(true);
            setMembershipStatus({ active: true, membership: verifyData.membership, daysLeft: 30, expiringSoon: false });
            await refreshProfile();
            toast({ title: "🎉 Payment Successful – Elite Membership Activated.", description: "Enjoy AI-powered alerts and priority features for 30 days!" });
          } catch (err: any) {
            toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
          }
          setPurchasing(false);
        },
        modal: {
          ondismiss: () => setPurchasing(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast({ title: "Payment Unsuccessful", description: "Please try again or choose another payment method.", variant: "destructive" });
        setPurchasing(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPurchasing(false);
    }
  };

  const addDemand = async () => {
    if (!user || !newKeywords.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("demand_alerts").insert({ user_id: user.id, keywords: newKeywords.trim(), category: newCategory.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Search tracked ✓" }); setNewKeywords(""); setNewCategory(""); fetchData(); }
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

  // Payment success screen
  if (paymentSuccess && !isElite) {
    return (
      <div className="safe-bottom flex min-h-screen flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-glow-pulse">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-foreground">Payment Successful!</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
          Elite Membership Activated. Enjoy AI-powered alerts and priority features for 30 days!
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-6 w-full max-w-xs dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
        >
          <Crown className="mr-2 h-4 w-4" /> Go to Elite Dashboard
        </Button>
      </div>
    );
  }

  // Non-elite upgrade page
  if (!isElite) {
    return (
      <div className="safe-bottom min-h-screen">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border glass-panel px-4 py-3">
          <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Elite Membership</h1>
        </header>

        <div className="flex flex-col items-center px-6 py-10 text-center animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl dentzap-gradient dentzap-shadow-lg animate-glow-pulse">
            <Crown className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Unlock Elite Membership</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-[280px] leading-relaxed">
            Get early alerts when products you want become available. Elite members discover products before anyone else.
          </p>

          {/* Price Card */}
          <div className="mt-6 w-full max-w-sm rounded-2xl glass-card p-5 glow-border">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</p>
                <p className="text-lg font-bold text-foreground mt-0.5">Elite Membership</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">₹100</p>
                <p className="text-[10px] text-muted-foreground">30 days</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-5 w-full max-w-sm space-y-2.5">
            {[
              { icon: Sparkles, text: "AI-powered product matching" },
              { icon: Bell, text: "Instant notifications for new listings" },
              { icon: Eye, text: "Early access before other buyers" },
              { icon: TrendingUp, text: "Priority search placement" },
              { icon: Shield, text: "Elite badge on your profile" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-2xl glass-card p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Payment Method Selection */}
          <div className="mt-6 w-full max-w-sm">
            <p className="mb-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select Payment Method</p>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                    selectedMethod === method.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border glass-card"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    selectedMethod === method.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    <method.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground">{method.label}</p>
                    <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 ${
                    selectedMethod === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedMethod === method.id && (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="mt-6 w-full max-w-sm gap-2 dentzap-gradient rounded-xl py-5 text-sm font-bold text-primary-foreground dentzap-shadow glow-primary"
          >
            {purchasing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing Payment...</>
            ) : (
              <><Crown className="h-4 w-4" /> Pay ₹100 & Activate Elite</>
            )}
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground">Secure payment via Razorpay. Auto-expires after 30 days.</p>
        </div>
      </div>
    );
  }

  // Elite member dashboard
  const expiresAt = membershipStatus?.membership?.expires_at
    ? new Date(membershipStatus.membership.expires_at)
    : null;
  const daysLeft = membershipStatus?.daysLeft || 0;

  return (
    <div className="safe-bottom min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border glass-panel">
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

        {/* Membership Status Bar */}
        {!checkingStatus && membershipStatus && (
          <div className={`mx-auto max-w-lg px-4 pb-2`}>
            <div className={`flex items-center gap-2.5 rounded-xl p-3 ${
              membershipStatus.expiringSoon
                ? "border border-destructive/20 bg-destructive/5"
                : "border border-primary/15 bg-primary/5"
            }`}>
              {membershipStatus.expiringSoon ? (
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {membershipStatus.expiringSoon
                    ? `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                    : "Elite Member"
                  }
                </p>
                {expiresAt && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Valid until: {expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
              {membershipStatus.expiringSoon && (
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  size="sm"
                  className="dentzap-gradient text-[11px] font-bold text-primary-foreground rounded-lg h-8 px-3"
                >
                  {purchasing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Renew"}
                </Button>
              )}
            </div>
          </div>
        )}

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
                  ? "bg-primary text-primary-foreground glow-primary"
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
                <div key={i} className="rounded-2xl glass-card p-4">
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
                  onClick={() => markRead(notif.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all animate-fade-in ${
                    notif.is_read ? "border-border glass-card" : "border-primary/20 bg-primary/5"
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
                        {!notif.is_read && <div className="h-2 w-2 shrink-0 rounded-full bg-primary animate-glow-pulse" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {notif.listing && <span className="text-xs font-bold text-primary">{formatPrice(notif.listing.price)}</span>}
                        <span className="rounded-full bg-verified/10 px-2 py-0.5 text-[9px] font-semibold text-verified">
                          {Math.round((notif.match_score || 0) * 100)}% match
                        </span>
                        <span className="text-[10px] text-muted-foreground">{new Date(notif.created_at).toLocaleDateString()}</span>
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
            <div className="rounded-2xl glass-card p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">Track a Product</p>
              <Input value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} placeholder="e.g. Dental handpiece NSK" className="rounded-xl py-5" />
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category (optional)" className="rounded-xl py-5" />
              <Button onClick={addDemand} disabled={!newKeywords.trim() || adding} className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> {adding ? "Adding..." : "Track This Search"}
              </Button>
            </div>

            {demands.filter((d) => d.is_active).length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">No tracked searches</p>
                <p className="mt-1 text-xs text-muted-foreground">Add products you're looking for above</p>
              </div>
            ) : (
              demands.filter((d) => d.is_active).map((demand, i) => (
                <div key={demand.id} className="flex items-center gap-3 rounded-2xl glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{demand.keywords}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {demand.category && <span className="text-[10px] text-muted-foreground">{demand.category}</span>}
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {new Date(demand.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => removeDemand(demand.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
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
                <div key={notif.id} className="rounded-2xl glass-card p-4 opacity-70">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{notif.message}</p>
                  <span className="mt-1 inline-block text-[10px] text-muted-foreground">{new Date(notif.created_at).toLocaleDateString()}</span>
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
