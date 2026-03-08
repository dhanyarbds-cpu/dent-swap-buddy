import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, MapPin, Bell, Zap, Tag, Truck, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface NotifPrefs {
  chat_notifications: boolean;
  product_alerts: boolean;
  elite_alerts: boolean;
  promotional: boolean;
  proximity_radius_km: number;
  alert_frequency: string;
  price_alerts: boolean;
  tracking_alerts: boolean;
}

const defaultPrefs: NotifPrefs = {
  chat_notifications: true,
  product_alerts: true,
  elite_alerts: true,
  promotional: false,
  proximity_radius_km: 50,
  alert_frequency: "instant",
  price_alerts: true,
  tracking_alerts: true,
};

const frequencyOptions = [
  { value: "instant", label: "Instant", desc: "Get notified immediately" },
  { value: "hourly", label: "Hourly", desc: "Digest every hour" },
  { value: "daily", label: "Daily", desc: "Once a day summary" },
];

const NotificationSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPrefs({
          chat_notifications: (data as any).chat_notifications,
          product_alerts: (data as any).product_alerts,
          elite_alerts: (data as any).elite_alerts,
          promotional: (data as any).promotional,
          proximity_radius_km: (data as any).proximity_radius_km ?? 50,
          alert_frequency: (data as any).alert_frequency ?? "instant",
          price_alerts: (data as any).price_alerts ?? true,
          tracking_alerts: (data as any).tracking_alerts ?? true,
        });
      }
      setLoading(false);
    };
    fetchPrefs();
  }, [user]);

  const updatePref = async (key: keyof NotifPrefs, value: boolean | number | string) => {
    if (!user) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...updated } as any, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
      setPrefs(prefs);
    }
    setSaving(false);
  };

  const toggleItems = [
    { key: "chat_notifications" as const, label: "Chat Messages", desc: "New messages and negotiation updates", icon: <MessageSquare className="h-4 w-4 text-primary" /> },
    { key: "product_alerts" as const, label: "Product Alerts", desc: "When products match your interests or searches", icon: <Bell className="h-4 w-4 text-primary" /> },
    { key: "elite_alerts" as const, label: "Elite Alerts", desc: "Priority alerts for Elite membership features", icon: <Zap className="h-4 w-4 text-amber-500" /> },
    { key: "price_alerts" as const, label: "Price Drop Alerts", desc: "AI-powered pricing changes on wishlisted items", icon: <Tag className="h-4 w-4 text-verified" /> },
    { key: "tracking_alerts" as const, label: "Order Tracking", desc: "Shipment milestones: packed, shipped, delivered", icon: <Truck className="h-4 w-4 text-primary" /> },
    { key: "promotional" as const, label: "Promotions", desc: "Offers, tips, and product recommendations", icon: <Bell className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Notifications</h1>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
        ) : (
          <>
            {/* Toggle Preferences */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Alert Types</h2>
              </div>
              {toggleItems.map((item, i) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < toggleItems.length - 1 ? "border-b border-border" : ""}`}
                >
                  {item.icon}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={prefs[item.key] as boolean}
                    onCheckedChange={(v) => updatePref(item.key, v)}
                  />
                </div>
              ))}
            </div>

            {/* Proximity Settings */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Proximity Alerts</h2>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-foreground">Alert radius</p>
                  <span className="text-sm font-bold text-primary">{prefs.proximity_radius_km} km</span>
                </div>
                <Slider
                  value={[prefs.proximity_radius_km]}
                  min={5}
                  max={200}
                  step={5}
                  onValueCommit={(v) => updatePref("proximity_radius_km", v[0])}
                  className="w-full"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">5 km</span>
                  <span className="text-[10px] text-muted-foreground">200 km</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Get notified when products are listed within this distance from your location.</p>
            </div>

            {/* Frequency Settings */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Notification Frequency</h2>
              <div className="grid grid-cols-3 gap-2">
                {frequencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref("alert_frequency", opt.value)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      prefs.alert_frequency === opt.value
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/20"
                    }`}
                  >
                    <p className={`text-xs font-bold ${prefs.alert_frequency === opt.value ? "text-primary" : "text-foreground"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NotificationSettingsPage;
