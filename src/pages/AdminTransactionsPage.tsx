import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, IndianRupee, TrendingUp, Users, Receipt, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, timeAgo } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface OrderRow {
  id: string;
  status: string;
  price: number;
  buyer_service_fee: number;
  commission_amount: number;
  commission_rate: number;
  seller_payout: number;
  escrow_status: string;
  refund_status: string | null;
  refund_amount: number | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  listing: { title: string } | null;
}

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-primary/10 text-primary",
  completed: "bg-verified/10 text-verified",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

const AdminTransactionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, price, buyer_service_fee, commission_amount, commission_rate, seller_payout, escrow_status, refund_status, refund_amount, created_at, buyer_id, seller_id, listing:listings(title)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      setOrders(data as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const totalRevenue = orders.reduce((s, o) => s + (o.status !== "cancelled" ? (o.commission_amount || 0) : 0), 0);
  const totalBuyerFees = orders.reduce((s, o) => s + (o.status !== "cancelled" ? (o.buyer_service_fee || 0) : 0), 0);
  const totalSellerPayouts = orders.reduce((s, o) => s + (o.status === "completed" ? (o.seller_payout || 0) : 0), 0);
  const totalTransactions = orders.filter(o => o.status !== "cancelled").length;

  const handleRefund = async (orderId: string) => {
    setRefundingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          escrow_status: "refunded",
          refund_status: "processed",
          refund_amount: orders.find(o => o.id === orderId)?.price || 0,
        } as any)
        .eq("id", orderId);

      if (error) throw error;
      toast({ title: "Refund Processed", description: "Order has been refunded." });
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setRefundingId(null);
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Transactions</h1>
        <button onClick={fetchOrders} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Transactions", value: totalTransactions, icon: Receipt, color: "text-primary" },
            { label: "Platform Commission", value: formatPrice(totalRevenue), icon: TrendingUp, color: "text-verified" },
            { label: "Buyer Service Fees", value: formatPrice(totalBuyerFees), icon: IndianRupee, color: "text-amber-500" },
            { label: "Seller Payouts", value: formatPrice(totalSellerPayouts), icon: Users, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Transaction List */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Payment History</p>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {(order.listing as any)?.title || "Listing removed"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge[order.status] || "bg-secondary text-muted-foreground"}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-secondary/50 p-2">
                      <p className="text-[9px] text-muted-foreground">Total Paid</p>
                      <p className="text-xs font-bold text-foreground">{formatPrice(order.price + (order.buyer_service_fee || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/50 p-2">
                      <p className="text-[9px] text-muted-foreground">Commission</p>
                      <p className="text-xs font-bold text-verified">{formatPrice(order.commission_amount || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/50 p-2">
                      <p className="text-[9px] text-muted-foreground">Seller Gets</p>
                      <p className="text-xs font-bold text-primary">{formatPrice(order.seller_payout || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{timeAgo(order.created_at)}</span>
                    <span>Escrow: {order.escrow_status}</span>
                  </div>

                  {/* Refund button for paid/held orders */}
                  {(order.status === "paid" || order.escrow_status === "held") && order.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefund(order.id)}
                      disabled={refundingId === order.id}
                      className="w-full rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    >
                      {refundingId === order.id ? "Processing..." : "Process Refund"}
                    </Button>
                  )}

                  {order.refund_status && (
                    <div className="rounded-xl bg-destructive/5 px-3 py-2 text-[10px] text-destructive font-medium">
                      Refund: {order.refund_status} — {formatPrice(order.refund_amount || 0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminTransactionsPage;
