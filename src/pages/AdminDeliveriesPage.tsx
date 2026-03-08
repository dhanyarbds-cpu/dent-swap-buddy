import { useState, useEffect } from "react";
import { ArrowLeft, Truck, MapPin, Package, ShieldCheck, AlertTriangle, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, timeAgo } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface DeliveryOrder {
  id: string;
  status: string;
  price: number;
  created_at: string;
  seller_id: string;
  buyer_id: string;
  delivery_method: string;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_status: string;
  escrow_status: string;
  shipping_address: string | null;
  estimated_delivery: string | null;
  listing_title: string;
  seller_name: string;
  buyer_name: string;
}

const AdminDeliveriesPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "shipping" | "pickup" | "disputes">("all");

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, price, created_at, seller_id, buyer_id, delivery_method, courier_name, tracking_number, tracking_status, escrow_status, shipping_address, estimated_delivery, listing:listings(title)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data) { setLoading(false); return; }

      const userIds = new Set<string>();
      data.forEach((o: any) => { userIds.add(o.seller_id); userIds.add(o.buyer_id); });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", [...userIds]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      setOrders(
        data.map((o: any) => ({
          ...o,
          listing_title: o.listing?.title || "Removed",
          seller_name: profileMap.get(o.seller_id) || "Unknown",
          buyer_name: profileMap.get(o.buyer_id) || "Unknown",
        }))
      );
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "shipping" && o.delivery_method !== "shipping") return false;
    if (filter === "pickup" && o.delivery_method !== "pickup") return false;
    if (filter === "disputes" && o.escrow_status !== "held") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.listing_title.toLowerCase().includes(q) ||
        o.seller_name.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        (o.tracking_number && o.tracking_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const stats = {
    total: orders.length,
    shipping: orders.filter((o) => o.delivery_method === "shipping").length,
    pickup: orders.filter((o) => o.delivery_method === "pickup").length,
    escrowHeld: orders.filter((o) => o.escrow_status === "held").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-foreground">Delivery Management</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Shipping", value: stats.shipping, color: "text-primary" },
            { label: "Pickup", value: stats.pickup, color: "text-verified" },
            { label: "Escrow Held", value: stats.escrowHeld, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="rounded-xl pl-9" />
        </div>

        <div className="flex gap-2">
          {(["all", "shipping", "pickup", "disputes"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "shipping" ? "Shipping" : f === "pickup" ? "Pickup" : "Escrow Held"}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No deliveries found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{order.listing_title}</p>
                    <p className="text-xs text-primary font-bold mt-0.5">{formatPrice(order.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {order.delivery_method === "shipping" ? (
                      <Badge variant="outline" className="text-primary border-primary/30 text-[10px]"><Truck className="h-3 w-3 mr-1" /> Ship</Badge>
                    ) : (
                      <Badge variant="outline" className="text-verified border-verified/30 text-[10px]"><MapPin className="h-3 w-3 mr-1" /> Pickup</Badge>
                    )}
                    <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">
                      {order.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Seller: </span>
                    <span className="font-medium text-foreground">{order.seller_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buyer: </span>
                    <span className="font-medium text-foreground">{order.buyer_name}</span>
                  </div>
                </div>

                {order.courier_name && (
                  <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-1.5 text-[11px]">
                    <span className="text-muted-foreground">{order.courier_name}</span>
                    <span className="font-mono text-primary">{order.tracking_number}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-verified" />
                    <span className="text-[10px] font-medium text-foreground capitalize">{order.escrow_status}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    Tracking: {(order.tracking_status || "pending").replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(order.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDeliveriesPage;
