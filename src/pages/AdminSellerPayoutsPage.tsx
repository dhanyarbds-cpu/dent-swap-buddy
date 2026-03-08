import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, ShieldCheck, Wallet, CheckCircle, XCircle, Copy, Search, IndianRupee, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatPrice, timeAgo } from "@/lib/mockData";

interface PayoutOrder {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  price: number;
  seller_payout: number | null;
  commission_amount: number | null;
  buyer_service_fee: number | null;
  status: string;
  escrow_status: string;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  listing: { title: string } | null;
  seller_profile: { full_name: string; phone: string | null; user_id: string } | null;
  payout_details: { upi_id: string | null; bank_name: string | null; bank_account_number: string | null; ifsc_code: string | null; account_holder_name: string | null; payout_method: string } | null;
}

const AdminSellerPayoutsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [orders, setOrders] = useState<PayoutOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "released" | "all">("pending");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);

    let query = supabase
      .from("orders")
      .select("id, buyer_id, seller_id, listing_id, price, seller_payout, commission_amount, buyer_service_fee, status, escrow_status, payment_method, created_at, updated_at, listing:listings(title)")
      .order("created_at", { ascending: false })
      .limit(300);

    if (filter === "pending") {
      query = query.eq("status", "completed").eq("escrow_status", "held");
    } else if (filter === "released") {
      query = query.eq("escrow_status", "released");
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fetch error:", error);
      setOrders([]);
      setLoading(false);
      return;
    }

    const allOrders = (data || []) as any[];
    const sellerIds = [...new Set(allOrders.map((o) => o.seller_id))];

    // Fetch profiles and payout details in parallel
    const [profilesRes, payoutRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone").in("user_id", sellerIds.length ? sellerIds : ["__none__"]),
      supabase.from("seller_payout_details").select("seller_id, upi_id, bank_name, bank_account_number, ifsc_code, account_holder_name, payout_method").in("seller_id", sellerIds.length ? sellerIds : ["__none__"]),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
    const payoutMap = new Map((payoutRes.data || []).map((p) => [p.seller_id, p]));

    setOrders(
      allOrders.map((o) => ({
        ...o,
        seller_profile: profileMap.get(o.seller_id) || null,
        payout_details: payoutMap.get(o.seller_id) || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin, filter]);

  const handleReleasePayout = async (orderId: string) => {
    setActionId(orderId);
    const order = orders.find((o) => o.id === orderId);
    const { error } = await supabase
      .from("orders")
      .update({ escrow_status: "released", escrow_released_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: "Failed to release payout: " + error.message, variant: "destructive" });
    } else {
      // Notify seller
      if (order) {
        const listingTitle = order.listing?.title || "your order";
        const payoutAmount = order.seller_payout || order.price;
        await supabase.from("notifications").insert({
          user_id: order.seller_id,
          title: "Payout Released 💰",
          message: `Your payout of ₹${payoutAmount.toLocaleString("en-IN")} for "${listingTitle}" has been released. Please check your UPI/bank account.`,
          type: "payment",
          data: { order_id: orderId },
        });
      }
      toast({ title: "Payout Released ✓", description: "Escrow released & seller notified." });
      fetchOrders();
    }
    setActionId(null);
  };

  if (roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <button onClick={() => navigate("/")} className="mt-2 text-sm font-semibold text-primary underline">Go Home</button>
      </div>
    );
  }

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(s) ||
      (o.seller_profile?.full_name || "").toLowerCase().includes(s) ||
      (o.seller_profile?.phone || "").toLowerCase().includes(s) ||
      (o.payout_details?.upi_id || "").toLowerCase().includes(s) ||
      (o.listing?.title || "").toLowerCase().includes(s)
    );
  });

  const totalPending = filtered.filter((o) => o.escrow_status === "held" && o.status === "completed").reduce((s, o) => s + (o.seller_payout || 0), 0);
  const totalReleased = filtered.filter((o) => o.escrow_status === "released").reduce((s, o) => s + (o.seller_payout || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/admin")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Seller Payouts</h1>
          <p className="text-[11px] text-muted-foreground">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetchOrders} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <Loader2 className={`h-4 w-4 text-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search seller, UPI ID..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(["pending", "released", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-2 text-[10px] font-semibold capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Clock className="mx-auto h-5 w-5 text-amber-500" />
            <p className="mt-1 text-lg font-bold text-foreground">{formatPrice(totalPending)}</p>
            <p className="text-[10px] text-muted-foreground">Pending Payouts</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <CheckCircle className="mx-auto h-5 w-5 text-verified" />
            <p className="mt-1 text-lg font-bold text-foreground">{formatPrice(totalReleased)}</p>
            <p className="text-[10px] text-muted-foreground">Released</p>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">No payout orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const isPending = order.escrow_status === "held" && order.status === "completed";
              const isReleased = order.escrow_status === "released";
              const pd = order.payout_details;

              return (
                <div key={order.id} className={`rounded-2xl border bg-card p-4 space-y-3 ${isPending ? "border-amber-300/50" : "border-border"}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{order.listing?.title || "Unknown Listing"}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Order: {order.id.substring(0, 8)}...</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      isReleased ? "bg-verified/10 text-verified" :
                      isPending ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {isReleased ? "RELEASED" : isPending ? "PENDING PAYOUT" : order.escrow_status.toUpperCase()}
                    </span>
                  </div>

                  {/* Payout Details */}
                  <div className="space-y-2 rounded-xl bg-secondary/50 px-3 py-2.5">
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Seller Payout</span>
                      <span className="text-sm font-bold text-verified">{formatPrice(order.seller_payout || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Order Amount</span>
                      <span className="text-[11px] text-foreground">{formatPrice(order.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Commission</span>
                      <span className="text-[11px] text-foreground">{formatPrice(order.commission_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Seller</span>
                      <span className="text-[11px] font-medium text-foreground">{order.seller_profile?.full_name || "Unknown"}</span>
                    </div>
                    {order.seller_profile?.phone && (
                      <div className="flex justify-between">
                        <span className="text-[11px] text-muted-foreground">Phone</span>
                        <span className="text-[11px] text-foreground">{order.seller_profile.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Time</span>
                      <span className="text-[11px] text-foreground">{timeAgo(order.created_at)}</span>
                    </div>
                  </div>

                  {/* Seller Payout Destination */}
                  {pd && (
                    <div className="rounded-xl border border-border bg-background px-3 py-2.5 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout Destination</p>
                      {pd.payout_method === "upi" && pd.upi_id && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-muted-foreground">UPI ID</p>
                            <p className="text-sm font-bold text-foreground">{pd.upi_id}</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(pd.upi_id!); toast({ title: "Copied!" }); }}>
                            <Copy className="h-3.5 w-3.5 text-primary" />
                          </button>
                        </div>
                      )}
                      {pd.payout_method === "bank" && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-foreground">{pd.account_holder_name}</p>
                          <p className="text-[11px] text-foreground">{pd.bank_name} — {pd.bank_account_number}</p>
                          <p className="text-[11px] text-muted-foreground">IFSC: {pd.ifsc_code}</p>
                        </div>
                      )}
                      {!pd.upi_id && pd.payout_method === "upi" && (
                        <p className="text-[11px] text-destructive">⚠ Seller hasn't set UPI ID</p>
                      )}
                    </div>
                  )}
                  {!pd && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2">
                      <p className="text-[11px] text-destructive font-medium">⚠ Seller has no payout details configured</p>
                    </div>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <Button
                      onClick={() => handleReleasePayout(order.id)}
                      disabled={actionId === order.id}
                      className="w-full gap-1.5 rounded-xl bg-verified text-white hover:bg-verified/90"
                      size="sm"
                    >
                      {actionId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      Mark Payout Released
                    </Button>
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

export default AdminSellerPayoutsPage;
