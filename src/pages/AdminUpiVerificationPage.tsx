import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, CheckCircle, XCircle, Loader2, Search, IndianRupee, Clock, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatPrice, timeAgo } from "@/lib/mockData";

interface UpiOrder {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  price: number;
  buyer_service_fee: number | null;
  commission_amount: number | null;
  seller_payout: number | null;
  status: string;
  payment_method: string | null;
  razorpay_payment_id: string | null; // stores UTR for UPI orders
  escrow_status: string;
  created_at: string;
  listing: { title: string } | null;
  buyer_profile: { full_name: string; phone: string | null } | null;
  seller_profile: { full_name: string } | null;
}

const AdminUpiVerificationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [orders, setOrders] = useState<UpiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("id, buyer_id, seller_id, listing_id, price, buyer_service_fee, commission_amount, seller_payout, status, payment_method, razorpay_payment_id, escrow_status, created_at, listing:listings(title)")
      .in("payment_method", ["upi", "upi_qr"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "pending") {
      query = query.in("status", ["pending_verification", "pending_upi_verification"]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fetch error:", error);
      setOrders([]);
    } else {
      // Fetch buyer/seller profiles
      const allOrders = (data || []) as any[];
      const buyerIds = [...new Set(allOrders.map((o) => o.buyer_id))];
      const sellerIds = [...new Set(allOrders.map((o) => o.seller_id))];
      const allIds = [...new Set([...buyerIds, ...sellerIds])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", allIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      setOrders(
        allOrders.map((o) => ({
          ...o,
          buyer_profile: profileMap.get(o.buyer_id) || null,
          seller_profile: profileMap.get(o.seller_id) || null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin, filter]);

  const handleVerify = async (orderId: string) => {
    setActionId(orderId);
    // Update order status to paid and escrow to held
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid", escrow_status: "held" })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: "Failed to verify payment: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Verified ✓", description: "Order marked as paid. Escrow is now held." });
      // Also update the listing status to sold
      const order = orders.find((o) => o.id === orderId);
      if (order?.listing_id) {
        await supabase.from("listings").update({ status: "sold" }).eq("id", order.listing_id);
      }
      fetchOrders();
    }
    setActionId(null);
  };

  const handleReject = async (orderId: string) => {
    setActionId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled", escrow_status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: "Failed to reject: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Rejected", description: "Order has been cancelled." });
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
        <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
        <button onClick={() => navigate("/")} className="mt-2 text-sm font-semibold text-primary underline">Go Home</button>
      </div>
    );
  }

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(s) ||
      (o.razorpay_payment_id || "").toLowerCase().includes(s) ||
      (o.buyer_profile?.full_name || "").toLowerCase().includes(s) ||
      (o.buyer_profile?.phone || "").toLowerCase().includes(s) ||
      (o.listing?.title || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/admin")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">UPI Verification</h1>
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
              placeholder="Search by UTR, name, phone..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${filter === "pending" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: orders.filter((o) => ["pending_verification", "pending_upi_verification"].includes(o.status)).length, icon: Clock, color: "text-amber-500" },
            { label: "Verified", value: orders.filter((o) => o.status === "paid").length, icon: CheckCircle, color: "text-verified" },
            { label: "Rejected", value: orders.filter((o) => o.status === "cancelled").length, icon: XCircle, color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <stat.icon className={`mx-auto h-5 w-5 ${stat.color}`} />
              <p className="mt-1 text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-verified/30" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const isPending = ["pending_verification", "pending_upi_verification"].includes(order.status);
              return (
                <div key={order.id} className={`rounded-2xl border bg-card p-4 space-y-3 ${isPending ? "border-amber-300/50" : "border-border"}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{order.listing?.title || "Unknown Listing"}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Order: {order.id.substring(0, 8)}...</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      isPending ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      order.status === "paid" ? "bg-verified/10 text-verified" :
                      order.status === "completed" ? "bg-verified/10 text-verified" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {order.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 rounded-xl bg-secondary/50 px-3 py-2.5">
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Amount</span>
                      <span className="text-sm font-bold text-foreground">{formatPrice(order.price)}</span>
                    </div>
                    {order.buyer_service_fee ? (
                      <div className="flex justify-between">
                        <span className="text-[11px] text-muted-foreground">Buyer Fee</span>
                        <span className="text-[11px] text-foreground">+{formatPrice(order.buyer_service_fee)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Buyer</span>
                      <span className="text-[11px] font-medium text-foreground">{order.buyer_profile?.full_name || "Unknown"}</span>
                    </div>
                    {order.buyer_profile?.phone && (
                      <div className="flex justify-between">
                        <span className="text-[11px] text-muted-foreground">Phone</span>
                        <span className="text-[11px] text-foreground">{order.buyer_profile.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Seller</span>
                      <span className="text-[11px] font-medium text-foreground">{order.seller_profile?.full_name || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground">UTR / Ref</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-semibold text-primary">{order.razorpay_payment_id || "N/A"}</span>
                        {order.razorpay_payment_id && (
                          <button onClick={() => { navigator.clipboard.writeText(order.razorpay_payment_id!); toast({ title: "Copied!" }); }}>
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Method</span>
                      <span className="text-[11px] text-foreground uppercase">{order.payment_method || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">Time</span>
                      <span className="text-[11px] text-foreground">{timeAgo(order.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleVerify(order.id)}
                        disabled={actionId === order.id}
                        className="flex-1 gap-1.5 rounded-xl bg-verified text-white hover:bg-verified/90"
                        size="sm"
                      >
                        {actionId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        Verify
                      </Button>
                      <Button
                        onClick={() => handleReject(order.id)}
                        disabled={actionId === order.id}
                        variant="outline"
                        className="flex-1 gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                        size="sm"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
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

export default AdminUpiVerificationPage;
