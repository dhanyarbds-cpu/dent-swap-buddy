import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Loader2, MessageSquare, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, timeAgo } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  status: string;
  price: number;
  created_at: string;
  seller_id: string;
  listing: {
    id: string;
    title: string;
    images: string[] | null;
    category: string;
  } | null;
  seller_profile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-verified/10 text-verified",
  cancelled: "bg-destructive/10 text-destructive",
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, price, created_at, seller_id, listing:listings(id, title, images, category)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        // Fetch seller profiles
        const sellerIds = [...new Set(data.map((o: any) => o.seller_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", sellerIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        setOrders(
          data.map((o: any) => ({
            ...o,
            seller_profile: profileMap.get(o.seller_id) || null,
          }))
        );
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">My Orders</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">No orders yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px]">
              Your purchase history will appear here once you buy something.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="mt-6 dentzap-gradient rounded-xl px-6 py-5 text-sm font-semibold text-primary-foreground"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const listing = order.listing;
              const img = listing?.images?.[0];
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow space-y-3"
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {img ? (
                        <img src={img} alt={listing?.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl">🦷</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{listing?.title || "Listing removed"}</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(order.price)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColors[order.status] || "bg-secondary text-muted-foreground"}`}>
                          {order.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(order.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {order.seller_profile && (
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <div className="flex items-center gap-2">
                        {order.seller_profile.avatar_url ? (
                          <img src={order.seller_profile.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">
                            {order.seller_profile.full_name?.[0] || "?"}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">{order.seller_profile.full_name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate("/messages")}
                          className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                        >
                          <MessageSquare className="h-3 w-3" /> Chat
                        </button>
                        {order.status === "completed" && (
                          <button
                            onClick={() => navigate("/reviews")}
                            className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:underline"
                          >
                            <Star className="h-3 w-3" /> Rate
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;
