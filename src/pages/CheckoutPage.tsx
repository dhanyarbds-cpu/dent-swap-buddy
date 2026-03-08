import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle, Package, MapPin, Truck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CheckoutPageProps {
  listing: {
    id: string;
    title: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
    location: string;
    seller: { name: string; verified: boolean };
  };
  onBack: () => void;
}

const CheckoutPage = ({ listing, onBack }: CheckoutPageProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"delivery" | "review" | "pay">("delivery");
  const [commissionInfo, setCommissionInfo] = useState<{ rate: number; buyer_fee_rate: number } | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [shippingAddress, setShippingAddress] = useState("");
  const [listingDetails, setListingDetails] = useState<{ pickup_available: boolean; shipping_available: boolean } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [commRes, listingRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "commission").single(),
        supabase.from("listings").select("pickup_available, shipping_available").eq("id", listing.id).single(),
      ]);
      if (commRes.data?.value) setCommissionInfo(commRes.data.value as any);
      if (listingRes.data) {
        setListingDetails(listingRes.data as any);
        if (!(listingRes.data as any).pickup_available && (listingRes.data as any).shipping_available) {
          setDeliveryMethod("shipping");
        }
      }
    };
    fetchAll();
  }, [listing.id]);

  const buyerFeeRate = commissionInfo?.buyer_fee_rate ?? 1;
  const commissionRate = commissionInfo?.rate ?? 1;
  const buyerServiceFee = Math.round((listing.price * buyerFeeRate) / 100 * 100) / 100;
  const platformCommission = Math.round((listing.price * commissionRate) / 100 * 100) / 100;
  const sellerGets = Math.round((listing.price - platformCommission) * 100) / 100;
  const totalPayment = Math.round((listing.price + buyerServiceFee) * 100) / 100;

  const handleStripePayment = async () => {
    if (!user) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          listing_id: listing.id,
          amount: listing.price,
          delivery_method: deliveryMethod,
          shipping_address: deliveryMethod === "shipping" ? shippingAddress : null,
        },
      });

      if (error || !data?.url) {
        throw new Error(data?.error || error?.message || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
      setProcessing(false);
    }
  };

  const img = listing.images?.[0];
  const pickupAvailable = listingDetails?.pickup_available ?? true;
  const shippingAvailable = listingDetails?.shipping_available ?? false;

  return (
    <div className="safe-bottom min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={step === "delivery" ? onBack : () => {
          const backMap: Record<string, "delivery" | "review" | "pay"> = { review: "delivery", pay: "review" };
          setStep(backMap[step] || "delivery");
        }} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Checkout</h1>
        <div className="flex items-center gap-1 text-[10px] font-medium text-verified">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-5 animate-fade-in">
        {/* Step indicator */}
        <div className="flex gap-1">
          {["Delivery", "Review", "Pay"].map((s, i) => {
            const stepMap = ["delivery", "review", "pay"];
            const currentIdx = stepMap.indexOf(step);
            return (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= currentIdx ? "bg-primary" : "bg-secondary"}`} />
            );
          })}
        </div>

        {/* Step 1: Delivery Method */}
        {step === "delivery" && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold text-foreground">Choose Delivery Method</p>
              <p className="mt-1 text-sm text-muted-foreground">How would you like to receive this item?</p>
            </div>

            <div className="space-y-3">
              {pickupAvailable && (
                <button
                  onClick={() => setDeliveryMethod("pickup")}
                  className={`w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                    deliveryMethod === "pickup" ? "border-verified bg-verified/5 ring-1 ring-verified/20" : "border-border bg-card"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${deliveryMethod === "pickup" ? "bg-verified/10" : "bg-secondary"}`}>
                    <MapPin className={`h-5 w-5 ${deliveryMethod === "pickup" ? "text-verified" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Local Pickup</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Meet seller in {listing.location}. Inspect before paying.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-verified/10 px-2 py-0.5 text-[10px] font-semibold text-verified">Free</span>
                      <span className="text-[10px] text-muted-foreground">No shipping cost</span>
                    </div>
                  </div>
                  {deliveryMethod === "pickup" && <CheckCircle className="h-5 w-5 text-verified shrink-0" />}
                </button>
              )}

              {shippingAvailable && (
                <button
                  onClick={() => setDeliveryMethod("shipping")}
                  className={`w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                    deliveryMethod === "shipping" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${deliveryMethod === "shipping" ? "bg-primary/10" : "bg-secondary"}`}>
                    <Truck className={`h-5 w-5 ${deliveryMethod === "shipping" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Courier Shipping</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Ship via India Post, DTDC, Blue Dart, FedEx, etc.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Paid</span>
                      <span className="text-[10px] text-muted-foreground">Shipping cost discussed with seller</span>
                    </div>
                  </div>
                  {deliveryMethod === "shipping" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                </button>
              )}
            </div>

            {deliveryMethod === "shipping" && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Shipping Address</label>
                  <Textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Full address with pincode for delivery..."
                    rows={3}
                    className="rounded-xl"
                    maxLength={300}
                  />
                </div>
              </div>
            )}

            {deliveryMethod === "pickup" && (
              <div className="rounded-2xl border border-verified/20 bg-verified/5 p-4 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-verified" />
                  <p className="text-sm font-semibold text-foreground">Pickup Location</p>
                </div>
                <p className="text-xs text-muted-foreground">{listing.location}</p>
                <ul className="text-[11px] text-muted-foreground space-y-1 mt-2">
                  <li>• Meet in a public, well-lit area</li>
                  <li>• Inspect the item thoroughly before paying</li>
                  <li>• Coordinate meeting time via chat</li>
                </ul>
              </div>
            )}

            <Button
              onClick={() => setStep("review")}
              disabled={deliveryMethod === "shipping" && !shippingAddress.trim()}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-40"
            >
              Continue to Review
            </Button>
          </div>
        )}

        {/* Step 2: Order Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Order Summary</p>
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {img ? <img src={img} alt={listing.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">🦷</div>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground line-clamp-2">{listing.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{listing.condition} · {listing.category}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Seller: {listing.seller.name}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {deliveryMethod === "shipping" ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary"><Truck className="h-3 w-3" /> Courier Shipping</span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1.5 text-[11px] font-semibold text-verified"><MapPin className="h-3 w-3" /> Local Pickup</span>
                )}
              </div>

              {deliveryMethod === "shipping" && shippingAddress && (
                <div className="mt-2 rounded-xl bg-secondary/50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Ship to</p>
                  <p className="text-xs text-foreground mt-0.5">{shippingAddress}</p>
                </div>
              )}

              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Product Price</span>
                  <span className="text-sm font-medium text-foreground">{formatPrice(listing.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    Service Fee <span className="text-[10px] text-muted-foreground/60">({buyerFeeRate}%)</span>
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">+{formatPrice(buyerServiceFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-border pt-2">
                  <span className="text-sm font-semibold text-foreground">Total Payment</span>
                  <span className="text-lg font-bold text-foreground">{formatPrice(totalPayment)}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl bg-secondary/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Distribution</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Seller receives</span>
                  <span className="text-[11px] font-semibold text-verified">{formatPrice(sellerGets)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Platform fee ({commissionRate}% + {buyerFeeRate}%)</span>
                  <span className="text-[11px] font-semibold text-primary">{formatPrice(platformCommission + buyerServiceFee)}</span>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep("pay")} className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow">
              Proceed to Pay {formatPrice(totalPayment)}
            </Button>
          </div>
        )}

        {/* Step 3: Pay via Stripe */}
        {step === "pay" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-card p-5 text-center space-y-4">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Secure Payment</p>
                <p className="mt-1 text-sm text-muted-foreground">Pay {formatPrice(totalPayment)} via Stripe</p>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Stripe's secure checkout to complete payment using cards, UPI, or netbanking.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-verified/20 bg-verified/5 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Buyer Protection</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Payment is held securely by Stripe. Funds are released to the seller only after you confirm {deliveryMethod === "shipping" ? "delivery" : "pickup"}.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accepted Methods</p>
                <div className="flex flex-wrap gap-2">
                  {["💳 Cards", "🏦 Netbanking", "📱 UPI", "💰 Wallets"].map((m) => (
                    <span key={m} className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-foreground">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleStripePayment}
              disabled={processing}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-50"
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Stripe...</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pay {formatPrice(totalPayment)}</>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CheckoutPage;
