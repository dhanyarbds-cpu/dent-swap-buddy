import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface NotifPrefs {
  chat_notifications: boolean;
  product_alerts: boolean;
  elite_alerts: boolean;
  promotional: boolean;
}

const defaultPrefs: NotifPrefs = {
  chat_notifications: true,
  product_alerts: true,
  elite_alerts: true,
  promotional: false,
};

const NotificationSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
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
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updatePref = async (key: keyof NotifPrefs, value: boolean) => {
    if (!user) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        ...updated,
      } as any, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
      setPrefs(prefs); // revert
    }
    setSaving(false);
  };

  const items = [
    { key: "chat_notifications" as const, label: "Chat Messages", desc: "Get notified when you receive new messages" },
    { key: "product_alerts" as const, label: "Product Alerts", desc: "Notifications when new products match your interests" },
    { key: "elite_alerts" as const, label: "Elite Alerts", desc: "Priority alerts for Elite membership features" },
    { key: "promotional" as const, label: "Promotions", desc: "Offers, tips, and product recommendations" },
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

      <main className="mx-auto max-w-lg p-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card dentzap-card-shadow">
            {items.map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center gap-4 px-4 py-4 ${i < items.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={(v) => updatePref(item.key, v)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationSettingsPage;
