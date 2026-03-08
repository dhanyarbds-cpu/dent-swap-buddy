import { useState, useEffect } from "react";
import { Bell, MessageSquare, Truck, Tag, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data || []);
      setUnreadCount(data?.filter((n: any) => !n.is_read).length || 0);
    };

    fetchNotifications();

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as any, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (n: any) => {
    // Mark as read
    if (!n.is_read) {
      supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then(() => {});
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on type
    const data = n.data || {};
    setOpen(false);
    switch (n.type) {
      case "order":
      case "tracking":
        navigate("/orders");
        break;
      case "chat":
        navigate("/messages");
        break;
      case "certificate":
        if (data.listing_id) navigate(`/verify-certificate?id=${data.certificate_id || ""}`);
        break;
      case "complaint":
        navigate("/complaints");
        break;
      case "price_alert":
        navigate("/my-ads");
        break;
      case "elite":
        navigate("/elite");
        break;
      default:
        break;
    }
  };

  const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    certificate: { icon: <ShieldCheck className="h-4 w-4" />, color: "text-verified" },
    escrow: { icon: <ShieldCheck className="h-4 w-4" />, color: "text-primary" },
    complaint: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-destructive" },
    order: { icon: <Truck className="h-4 w-4" />, color: "text-primary" },
    tracking: { icon: <Truck className="h-4 w-4" />, color: "text-verified" },
    chat: { icon: <MessageSquare className="h-4 w-4" />, color: "text-primary" },
    price_alert: { icon: <Tag className="h-4 w-4" />, color: "text-amber-500" },
    general: { icon: <Bell className="h-4 w-4" />, color: "text-muted-foreground" },
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            notifications.map((n) => {
              const config = typeConfig[n.type] || typeConfig.general;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-secondary/50 ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <span className={`mt-0.5 ${config.color}`}>{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {n.type === "tracking" && (
                        <span className="text-[9px] font-bold text-primary">Track →</span>
                      )}
                      {n.type === "price_alert" && (
                        <span className="text-[9px] font-bold text-amber-500">Review →</span>
                      )}
                      {n.type === "chat" && (
                        <span className="text-[9px] font-bold text-primary">Reply →</span>
                      )}
                    </div>
                  </div>
                  {!n.is_read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
