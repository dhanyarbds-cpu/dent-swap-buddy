import { useState, useEffect } from "react";
import { ArrowLeft, RotateCcw, Loader2, CheckCircle, XCircle, Package, Clock, AlertTriangle, Eye, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, timeAgo } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReturnRequest {
  id: string;
  order_id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  reason: string;
  description: string | null;
  evidence_urls: string[];
  status: string;
  admin_notes: string | null;
  seller_response: string | null;
  refund_amount: number | null;
  refund_processed_at: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface ReturnWithDetails extends ReturnRequest {
  listing: { title: string; images: string[] | null } | null;
  buyer_profile: { full_name: string; avatar_url: string | null } | null;
  seller_profile: { full_name: string; avatar_url: string | null } | null;
}

const REASON_LABELS: Record<string, string> = {
  not_as_described: "Product not as described",
  damaged: "Damaged product",
  wrong_item: "Wrong item received",
  quality_issue: "Quality issue",
  no_longer_needed: "No longer needed",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
  product_returned: { label: "Product Returned", color: "bg-blue-100 text-blue-700", icon: Package },
  refund_completed: { label: "Refund Completed", color: "bg-verified/10 text-verified", icon: DollarSign },
};

const AdminReturnsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [returns, setReturns] = useState<ReturnWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnWithDetails | null>(null);
  const [sellerResponse, setSellerResponse] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchReturns();
  }, [user]);

  const fetchReturns = async () => {
    if (!user) return;

    // Fetch returns where user is seller (for sellers to manage)
    // In production, add admin role check
    const { data, error } = await supabase
      .from("return_requests")
      .select("*")
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading returns", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch related data
    const listingIds = [...new Set((data || []).map((r) => r.listing_id).filter(Boolean))];
    const userIds = [...new Set((data || []).flatMap((r) => [r.buyer_id, r.seller_id]))];

    const [listingsRes, profilesRes] = await Promise.all([
      listingIds.length > 0
        ? supabase.from("listings").select("id, title, images").in("id", listingIds)
        : { data: [] },
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
    ]);

    const listingsMap = new Map((listingsRes.data || []).map((l) => [l.id, l]));
    const profilesMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));

    const enriched = (data || []).map((r) => ({
      ...r,
      listing: r.listing_id ? listingsMap.get(r.listing_id) || null : null,
      buyer_profile: profilesMap.get(r.buyer_id) || null,
      seller_profile: profilesMap.get(r.seller_id) || null,
    }));

    setReturns(enriched);
    setLoading(false);
  };

  const handleUpdateStatus = async (returnId: string, newStatus: string) => {
    setProcessing(true);
    try {
      const updateData: any = {
        status: newStatus,
        seller_response: sellerResponse.trim() || null,
      };

      if (newStatus === "approved" || newStatus === "rejected") {
        updateData.resolved_at = new Date().toISOString();
      }

      if (newStatus === "refund_completed") {
        updateData.refund_processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("return_requests")
        .update(updateData)
        .eq("id", returnId);

      if (error) throw error;

      // Update order status if refund completed
      if (newStatus === "refund_completed" && selectedReturn) {
        await supabase
          .from("orders")
          .update({ 
            status: "refunded",
            escrow_status: "refunded",
            refund_status: "completed",
            refund_amount: selectedReturn.refund_amount,
          })
          .eq("id", selectedReturn.order_id);
      }

      toast({ title: `Return ${newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "updated"} ✓` });
      setSelectedReturn(null);
      setSellerResponse("");
      fetchReturns();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const filteredReturns = returns.filter((r) => {
    if (activeTab === "all") return true;
    return r.status === activeTab;
  });

  const isSeller = (r: ReturnWithDetails) => r.seller_id === user?.id;

  const stats = {
    total: returns.length,
    pending: returns.filter((r) => r.status === "pending").length,
    approved: returns.filter((r) => r.status === "approved" || r.status === "product_returned").length,
    completed: returns.filter((r) => r.status === "refund_completed").length,
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Returns & Refunds</h1>
      </header>

      <main className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: stats.total, color: "bg-secondary" },
            { label: "Pending", value: stats.pending, color: "bg-amber-100 dark:bg-amber-900/30" },
            { label: "In Progress", value: stats.approved, color: "bg-primary/10" },
            { label: "Refunded", value: stats.completed, color: "bg-verified/10" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl ${stat.color} p-3 text-center`}>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
            <TabsTrigger value="refund_completed" className="text-xs">Refunded</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
              <RotateCcw className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">No return requests</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {activeTab === "pending" ? "No pending requests to review." : "No returns in this category."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReturns.map((returnReq) => {
              const StatusIcon = STATUS_CONFIG[returnReq.status]?.icon || Clock;
              const statusConfig = STATUS_CONFIG[returnReq.status] || STATUS_CONFIG.pending;

              return (
                <div
                  key={returnReq.id}
                  className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow space-y-3"
                >
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {returnReq.listing?.images?.[0] ? (
                        <img src={returnReq.listing.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">
                        {returnReq.listing?.title || "Product"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {REASON_LABELS[returnReq.reason] || returnReq.reason}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(returnReq.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatPrice(returnReq.refund_amount || 0)}</p>
                      <span className={`text-[9px] font-medium ${isSeller(returnReq) ? "text-amber-600" : "text-verified"}`}>
                        {isSeller(returnReq) ? "You're Seller" : "You're Buyer"}
                      </span>
                    </div>
                  </div>

                  {/* Buyer/Seller Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Buyer: <span className="font-medium text-foreground">{returnReq.buyer_profile?.full_name || "Unknown"}</span>
                    </span>
                    <span>
                      Seller: <span className="font-medium text-foreground">{returnReq.seller_profile?.full_name || "Unknown"}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReturn(returnReq);
                        setSellerResponse(returnReq.seller_response || "");
                      }}
                      className="flex-1 rounded-xl text-xs"
                    >
                      <Eye className="mr-1.5 h-3 w-3" /> View Details
                    </Button>
                    {isSeller(returnReq) && returnReq.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(returnReq);
                            handleUpdateStatus(returnReq.id, "approved");
                          }}
                          className="rounded-xl bg-verified text-white hover:bg-verified/90 text-xs"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedReturn(returnReq);
                            setSellerResponse("");
                          }}
                          className="rounded-xl text-xs"
                        >
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Return Details Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={(o) => !o && setSelectedReturn(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-5 w-5 text-primary" />
              Return Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4 pt-2">
              {/* Product Info */}
              <div className="flex gap-3 rounded-xl bg-secondary/50 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {selectedReturn.listing?.images?.[0] ? (
                    <img src={selectedReturn.listing.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl">📦</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedReturn.listing?.title || "Product"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Order: {selectedReturn.order_id.slice(0, 8)}...
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">{formatPrice(selectedReturn.refund_amount || 0)}</p>
                </div>
              </div>

              {/* Reason & Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-foreground">
                    {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}
                  </span>
                </div>
                {selectedReturn.description && (
                  <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                    {selectedReturn.description}
                  </p>
                )}
              </div>

              {/* Evidence */}
              {selectedReturn.evidence_urls && selectedReturn.evidence_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Evidence Photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedReturn.evidence_urls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-secondary">
                        <img src={url} alt="" className="h-full w-full object-cover hover:scale-110 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[selectedReturn.status]?.color}`}>
                  {STATUS_CONFIG[selectedReturn.status]?.label || selectedReturn.status}
                </span>
              </div>

              {/* Seller Response Input (if seller and pending) */}
              {isSeller(selectedReturn) && selectedReturn.status === "pending" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Your Response <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <Textarea
                    value={sellerResponse}
                    onChange={(e) => setSellerResponse(e.target.value)}
                    placeholder="Add a note about your decision..."
                    className="min-h-[80px] resize-none rounded-xl"
                  />
                </div>
              )}

              {/* Existing seller response */}
              {selectedReturn.seller_response && selectedReturn.status !== "pending" && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Seller Response</p>
                  <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                    {selectedReturn.seller_response}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {isSeller(selectedReturn) && selectedReturn.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleUpdateStatus(selectedReturn.id, "approved")}
                    disabled={processing}
                    className="flex-1 bg-verified text-white hover:bg-verified/90 rounded-xl"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                    Approve Return
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedReturn.id, "rejected")}
                    disabled={processing}
                    className="flex-1 rounded-xl"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              )}

              {/* Mark as returned / Process refund */}
              {isSeller(selectedReturn) && selectedReturn.status === "approved" && (
                <Button
                  onClick={() => handleUpdateStatus(selectedReturn.id, "product_returned")}
                  disabled={processing}
                  className="w-full dentzap-gradient rounded-xl"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="mr-2 h-4 w-4" />}
                  Mark Product as Returned
                </Button>
              )}

              {isSeller(selectedReturn) && selectedReturn.status === "product_returned" && (
                <Button
                  onClick={() => handleUpdateStatus(selectedReturn.id, "refund_completed")}
                  disabled={processing}
                  className="w-full bg-verified text-white hover:bg-verified/90 rounded-xl"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="mr-2 h-4 w-4" />}
                  Process Refund
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReturnsPage;
