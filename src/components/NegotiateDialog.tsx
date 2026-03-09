import { useState, useEffect } from "react";
import { MessageSquare, IndianRupee, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NegotiateDialogProps {
  listingId: string;
  sellerId: string;
  askingPrice: number;
  listingTitle: string;
  listingStatus?: string;
}

const NegotiateDialog = ({ listingId, sellerId, askingPrice, listingTitle, listingStatus }: NegotiateDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Check for existing request when dialog opens
  useEffect(() => {
    if (!open || !user) return;
    setCheckingExisting(true);
    supabase
      .from("chat_requests")
      .select("id, status")
      .eq("buyer_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle()
      .then(({ data }) => {
        setExistingRequest(data ? data.status : null);
        setCheckingExisting(false);
      });
  }, [open, user, listingId]);

  const isUnavailable = listingStatus && listingStatus !== "active";

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to negotiate.", variant: "destructive" });
      return;
    }

    if (!sellerId) {
      toast({ title: "Seller info missing", description: "Cannot negotiate — seller information is unavailable. Please try again.", variant: "destructive" });
      return;
    }

    if (user.id === sellerId) {
      toast({ title: "Can't negotiate", description: "You can't negotiate on your own listing.", variant: "destructive" });
      return;
    }

    // Check listing status in real-time
    const { data: listing } = await supabase.from("listings").select("status, seller_id").eq("id", listingId).single();
    if (listing && listing.status !== "active") {
      toast({ title: "Listing unavailable", description: "This product is no longer available for negotiation.", variant: "destructive" });
      setOpen(false);
      return;
    }

    // Use the seller_id from the live listing as the source of truth
    const resolvedSellerId = listing?.seller_id || sellerId;

    setLoading(true);
    try {
      const { error } = await supabase.from("chat_requests").insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: resolvedSellerId,
        offered_price: offeredPrice ? parseFloat(offeredPrice) : null,
        message: message || `Interested in "${listingTitle}"`,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already requested", description: "You've already sent a request for this listing." });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Request sent! ✅", description: "The seller will review your negotiation request." });
        setOpen(false);
        setOfferedPrice("");
        setMessage("");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isUnavailable}
          className="dentzap-gradient dentzap-shadow w-full gap-2 rounded-xl py-6 text-base font-bold text-primary-foreground"
        >
          <MessageSquare className="h-5 w-5" />
          {isUnavailable ? "Listing Unavailable" : "Negotiate Price"}
        </Button>
      </DialogTrigger>
      <DialogContent className="mx-auto max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Negotiate Price</DialogTitle>
        </DialogHeader>

        {checkingExisting ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Checking...</div>
        ) : existingRequest ? (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You already have a <span className="font-semibold">{existingRequest}</span> request for this listing.
              </p>
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Asking Price</p>
              <p className="text-lg font-bold text-primary">₹{askingPrice.toLocaleString("en-IN")}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Your Offer (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                  placeholder="Enter your price"
                  className="rounded-xl pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Message (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'm interested in this item..."
                rows={3}
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="dentzap-gradient dentzap-shadow w-full rounded-xl py-5 font-bold text-primary-foreground"
            >
              {loading ? "Sending..." : "Send Negotiation Request"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NegotiateDialog;
