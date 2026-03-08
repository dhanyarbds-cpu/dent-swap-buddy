import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Loader2, MessageSquare, Star, ShieldCheck, CheckCircle, MapPin, Truck, Package, AlertTriangle, RotateCcw, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, timeAgo } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RaiseComplaintDialog from "@/components/RaiseComplaintDialog";
import ReturnRequestDialog from "@/components/ReturnRequestDialog";
import OrderTrackingTimeline from "@/components/OrderTrackingTimeline";

interface Order {
  id: string;
  status: string;
  price: number;
  created_at: string;
  seller_id: string;
  buyer_id: string;
  escrow_status: string;
  razorpay_payment_id: string | null;
  payment_method: string;
  delivery_method: string;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_status: string;
  estimated_delivery: string | null;
  tracking_history: any[];
  shipping_address: string | null;
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
  pending_verification: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-primary/10 text-primary",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-verified/10 text-verified",
  cancelled: "bg-destructive/10 text-destructive",
};

const escrowLabels: Record<string, string> = {
  pending: "Awaiting Payment",
  held: "Funds Held in Escrow",
  released: "Payment Released",
  refunded: "Refunded",
};

const TRACKING_STATUSES_SHIPPING = ["pending", "packed", "shipped", "in_transit", "out_for_delivery", "delivered"];
const TRACKING_STATUSES_PICKUP = ["pending", "confirmed", "ready", "delivered"];
const COURIER_OPTIONS = ["India Post", "DTDC", "Blue Dart", "FedEx", "Delhivery", "Ekart", "Other"];

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState({ orderId: "", courier: "", tracking: "", estimatedDays: "" });
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data: buyerOrders } = await supabase
        .from("orders")
        .select("id, status, price, created_at, seller_id, buyer_id, escrow_status, razorpay_payment_id, payment_method, delivery_method, courier_name, tracking_number, tracking_status, estimated_delivery, tracking_history, shipping_address, listing:listings(id, title, images, category)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      const { data: sellerOrders } = await supabase
        .from("orders")
        .select("id, status, price, created_at, seller_id, buyer_id, escrow_status, razorpay_payment_id, payment_method, delivery_method, courier_name, tracking_number, tracking_status, estimated_delivery, tracking_history, shipping_address, listing:listings(id, title, images, category)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      const allOrders = [...(buyerOrders || []), ...(sellerOrders || [])];
      const uniqueMap = new Map(allOrders.map((o: any) => [o.id, o]));
      const unique = Array.from(uniqueMap.values());

      const userIds = new Set<string>();
      unique.forEach((o: any) => { userIds.add(o.seller_id); userIds.add(o.buyer_id); });
      userIds.delete(user.id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", [...userIds]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setOrders(
        unique.map((o: any) => ({
          ...o,
          tracking_history: o.tracking_history || [],
          seller_profile: profileMap.get(o.seller_id) || null,
        }))
      );
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const handleConfirmDelivery = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-delivery", {
        body: { order_id: orderId },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "completed", escrow_status: "released" } : o
        )
      );
      toast({ title: "Delivery Confirmed ✓", description: "Payment has been released to the seller." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setConfirmingId(null);
  };

  const handleAddTracking = async () => {
    if (!trackingForm.courier || !trackingForm.tracking) return;
    setSavingTracking(true);
    try {
      const estimatedDelivery = trackingForm.estimatedDays
        ? new Date(Date.now() + parseInt(trackingForm.estimatedDays) * 86400000).toISOString()
        : null;

      const { error } = await supabase
        .from("orders")
        .update({
          courier_name: trackingForm.courier,
          tracking_number: trackingForm.tracking,
          delivery_method: "shipping",
          tracking_status: "shipped",
          estimated_delivery: estimatedDelivery,
          tracking_history: [
            { status: "pending", timestamp: new Date().toISOString(), note: "Order placed" },
            { status: "shipped", timestamp: new Date().toISOString(), note: `Shipped via ${trackingForm.courier}` },
          ],
        })
        .eq("id", trackingForm.orderId)
        .eq("seller_id", user!.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === trackingForm.orderId
            ? {
                ...o,
                courier_name: trackingForm.courier,
                tracking_number: trackingForm.tracking,
                delivery_method: "shipping",
                tracking_status: "shipped",
                estimated_delivery: estimatedDelivery,
              }
            : o
        )
      );
      toast({ title: "Tracking Added ✓", description: "Buyer will be notified." });
      setTrackingOpen(false);
      setTrackingForm({ orderId: "", courier: "", tracking: "", estimatedDays: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingTracking(false);
  };

  const handleUpdateTrackingStatus = async (orderId: string, newStatus: string, deliveryMethod: string) => {
    setUpdatingStatus(orderId);
    try {
      const order = orders.find((o) => o.id === orderId);
      const existingHistory = Array.isArray(order?.tracking_history) ? order.tracking_history : [];
      const newHistory = [
        ...existingHistory,
        { status: newStatus, timestamp: new Date().toISOString(), note: `Status updated to ${newStatus}` },
      ];

      const { error } = await supabase
        .from("orders")
        .update({ tracking_status: newStatus, tracking_history: newHistory })
        .eq("id", orderId)
        .eq("seller_id", user!.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, tracking_status: newStatus, tracking_history: newHistory } : o
        )
      );
      toast({ title: "Status Updated ✓" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUpdatingStatus(null);
  };

  const isSeller = (order: Order) => order.seller_id === user?.id;

  const getNextStatuses = (order: Order) => {
    const statuses = order.delivery_method === "shipping" ? TRACKING_STATUSES_SHIPPING : TRACKING_STATUSES_PICKUP;
    const currentIdx = statuses.indexOf(order.tracking_status);
    if (currentIdx < 0) return statuses.slice(1);
    return statuses.slice(currentIdx + 1);
  };

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
              const seller = isSeller(order);
              const nextStatuses = getNextStatuses(order);
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground line-clamp-1 flex-1">{listing?.title || "Listing removed"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${seller ? "bg-primary/10 text-primary" : "bg-verified/10 text-verified"}`}>
                          {seller ? "Selling" : "Buying"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(order.price)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColors[order.status] || "bg-secondary text-muted-foreground"}`}>
                          {order.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(order.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Method Badge */}
                  <div className="flex items-center gap-2">
                    {order.delivery_method === "shipping" ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                        <Truck className="h-3 w-3" /> Courier Shipping
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-verified/10 px-2.5 py-1 text-[10px] font-semibold text-verified">
                        <MapPin className="h-3 w-3" /> Local Pickup
                      </span>
                    )}
                    {order.shipping_address && order.delivery_method === "shipping" && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        📍 {order.shipping_address}
                      </span>
                    )}
                  </div>

                  {/* Tracking Timeline */}
                  <OrderTrackingTimeline
                    trackingStatus={order.tracking_status || (order.status === "completed" ? "delivered" : "pending")}
                    deliveryMethod={order.delivery_method}
                    estimatedDelivery={order.estimated_delivery}
                    trackingHistory={order.tracking_history || []}
                    courierName={order.courier_name}
                    trackingNumber={order.tracking_number}
                  />

                  {/* Seller: Update Tracking Status */}
                  {seller && order.escrow_status === "held" && nextStatuses.length > 0 && order.status !== "completed" && (
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(val) => handleUpdateTrackingStatus(order.id, val, order.delivery_method)}
                        disabled={updatingStatus === order.id}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-[11px] flex-1">
                          <SelectValue placeholder="Update delivery status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {nextStatuses.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updatingStatus === order.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                  )}

                  {/* Escrow Status */}
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2">
                    <ShieldCheck className="h-4 w-4 text-verified shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">
                      {escrowLabels[order.escrow_status] || order.escrow_status}
                    </span>
                    {order.razorpay_payment_id && (
                      <span className="ml-auto text-[9px] text-muted-foreground font-mono">
                        {order.razorpay_payment_id.slice(0, 14)}…
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    {order.seller_profile && !seller && (
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
                    )}
                    {seller && <span className="text-[10px] text-muted-foreground">You are the seller</span>}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => navigate("/messages")}
                        className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                      >
                        <MessageSquare className="h-3 w-3" /> Chat
                      </button>

                      {/* Seller: Add tracking */}
                      {seller && order.escrow_status === "held" && !order.tracking_number && (
                        <Dialog open={trackingOpen && trackingForm.orderId === order.id} onOpenChange={(open) => {
                          setTrackingOpen(open);
                          if (open) setTrackingForm({ orderId: order.id, courier: "", tracking: "", estimatedDays: "" });
                        }}>
                          <DialogTrigger asChild>
                            <button className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20">
                              <Truck className="h-3 w-3" /> Add Tracking
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle className="text-base">Add Shipping Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Courier Service</label>
                                <Select onValueChange={(val) => setTrackingForm((f) => ({ ...f, courier: val }))}>
                                  <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Select courier..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COURIER_OPTIONS.map((c) => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Tracking Number</label>
                                <Input
                                  value={trackingForm.tracking}
                                  onChange={(e) => setTrackingForm((f) => ({ ...f, tracking: e.target.value }))}
                                  placeholder="Enter tracking number"
                                  className="rounded-xl"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Estimated Delivery (days)</label>
                                <Input
                                  type="number"
                                  value={trackingForm.estimatedDays}
                                  onChange={(e) => setTrackingForm((f) => ({ ...f, estimatedDays: e.target.value }))}
                                  placeholder="e.g. 5"
                                  className="rounded-xl"
                                />
                              </div>
                              <Button
                                onClick={handleAddTracking}
                                disabled={!trackingForm.courier || !trackingForm.tracking || savingTracking}
                                className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
                              >
                                {savingTracking ? "Saving..." : "Save & Notify Buyer"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Buyer: Confirm delivery */}
                      {!seller && order.escrow_status === "held" && (
                        <button
                          onClick={() => handleConfirmDelivery(order.id)}
                          disabled={confirmingId === order.id}
                          className="flex items-center gap-1 rounded-full bg-verified/10 px-2.5 py-1 text-[10px] font-semibold text-verified hover:bg-verified/20 disabled:opacity-50"
                        >
                          {confirmingId === order.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          Confirm {order.delivery_method === "shipping" ? "Delivery" : "Pickup"}
                        </button>
                      )}
                      {order.status === "completed" && !seller && (
                        <button
                          onClick={() => navigate("/reviews")}
                          className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:underline"
                        >
                          <Star className="h-3 w-3" /> Rate
                        </button>
                      )}
                      {!seller && (order.escrow_status === "held" || order.status === "completed") && (
                        <>
                          <ReturnRequestDialog
                            orderId={order.id}
                            listingId={order.listing?.id || null}
                            sellerId={order.seller_id}
                            productName={order.listing?.title || "Unknown product"}
                            orderPrice={order.price}
                            sellerName={order.seller_profile?.full_name || "Seller"}
                            orderDate={order.created_at}
                          >
                            <button className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline">
                              <RotateCcw className="h-3 w-3" /> Return
                            </button>
                          </ReturnRequestDialog>
                          <RaiseComplaintDialog
                            orderId={order.id}
                            listingId={order.listing?.id || null}
                            sellerId={order.seller_id}
                            productName={order.listing?.title || "Unknown product"}
                          >
                            <button className="flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline">
                              <AlertTriangle className="h-3 w-3" /> Complaint
                            </button>
                          </RaiseComplaintDialog>
                        </>
                      )}
                    </div>
                  </div>
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
