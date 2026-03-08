import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, Smartphone, Loader2, CheckCircle, Package, Copy, ExternalLink, MapPin, Truck, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const COURIERS = ["India Post", "DTDC", "Blue Dart", "FedEx", "Delhivery", "Ekart", "Other"];

const CheckoutPage = ({ listing, onBack }: CheckoutPageProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [step, setStep] = useState<"delivery" | "review" | "method" | "pay" | "confirm">("delivery");
  const [commissionInfo, setCommissionInfo] = useState<{ rate: number; buyer_fee_rate: number } | null>(null);
  const [platformUpi, setPlatformUpi] = useState<{ upi_id: string; display_name: string } | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [shippingAddress, setShippingAddress] = useState("");
  const [listingDetails, setListingDetails] = useState<{ pickup_available: boolean; shipping_available: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "razorpay">("upi");

  useEffect(() => {
    const fetchAll = async () => {
      const [commRes, upiRes, listingRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "commission").single(),
        supabase.from("platform_settings").select("value").eq("key", "platform_upi").single(),
        supabase.from("listings").select("pickup_available, shipping_available").eq("id", listing.id).single(),
      ]);
      if (commRes.data?.value) setCommissionInfo(commRes.data.value as any);
      if (upiRes.data?.value) setPlatformUpi(upiRes.data.value as any);
      if (listingRes.data) {
        setListingDetails(listingRes.data as any);
        // Default to the available method
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

  const upiId = platformUpi?.upi_id || "9080970874@upi";

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    toast({ title: "UPI ID Copied!", description: upiId });
  };

  const openUpiApp = () => {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("DentSwap")}&am=${totalPayment}&cu=INR&tn=${encodeURIComponent(`Payment for ${listing.title}`)}`;
    window.location.href = upiUrl;
  };

  const handleRazorpayPayment = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: { listing_id: listing.id, amount: listing.price },
      });

      if (error || !data?.razorpay_order_id) {
        throw new Error(data?.error || error?.message || "Failed to create Razorpay order");
      }

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: "DentSwap",
        description: `Payment for ${listing.title}`,
        order_id: data.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await supabase.functions.invoke("verify-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: data.order_id,
              },
            });
            if (verifyRes.error || !verifyRes.data?.success) {
              throw new Error(verifyRes.data?.error || "Verification failed");
            }
            setPaymentSuccess(true);
            toast({ title: "Payment Successful! 🎉", description: "Your order has been placed and payment verified." });
          } catch (err: any) {
            toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
          }
        },
        prefill: {
          name: profile?.full_name || "",
          email: user.email || "",
          contact: profile?.phone || "",
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast({ title: "Payment Cancelled", description: "You can try again.", variant: "destructive" });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleSubmitUpiPayment = async () => {
    if (!user || !utrNumber.trim()) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-upi-order", {
        body: {
          listing_id: listing.id,
          amount: listing.price,
          utr_number: utrNumber.trim(),
          delivery_method: deliveryMethod,
          shipping_address: deliveryMethod === "shipping" ? shippingAddress : null,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to create order");
      }

      setPaymentSuccess(true);
      toast({ title: "Order Placed! 🎉", description: "Your payment is being verified. You'll be notified once confirmed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  if (paymentSuccess) {
    return (
      <div className="safe-bottom flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-verified/10 animate-fade-in">
          <CheckCircle className="h-10 w-10 text-verified" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-foreground">Order Placed!</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
          {deliveryMethod === "shipping"
            ? "Your UPI payment is being verified. The seller will ship your order and add tracking details."
            : "Your UPI payment is being verified. Coordinate with the seller for pickup."}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {deliveryMethod === "shipping" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Truck className="h-3.5 w-3.5" /> Courier Shipping</span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1.5 text-xs font-semibold text-verified"><MapPin className="h-3.5 w-3.5" /> Local Pickup</span>
          )}
        </div>
        <div className="mt-6 w-full max-w-xs space-y-3">
          <Button onClick={() => navigate("/orders")} className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground">
            <Package className="mr-2 h-4 w-4" /> View My Orders
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full rounded-xl py-5 text-sm">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const img = listing.images?.[0];
  const pickupAvailable = listingDetails?.pickup_available ?? true;
  const shippingAvailable = listingDetails?.shipping_available ?? false;

  return (
    <div className="safe-bottom min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={step === "delivery" ? onBack : () => {
          const backMap: Record<string, typeof step> = { review: "delivery", method: "review", pay: "method", confirm: "pay" };
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
          {["Delivery", "Review", "Pay", "Confirm"].map((s, i) => {
            const stepMap = ["delivery", "review", "pay", "confirm"];
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
                <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Shipping cost will be confirmed by the seller. You can discuss details in chat after placing the order.
                  </p>
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

              {/* Delivery method badge */}
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
                    Buyer Service Fee <span className="text-[10px] text-muted-foreground/60">({buyerFeeRate}%)</span>
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
                  <span className="text-[11px] text-muted-foreground">Platform commission ({commissionRate}%)</span>
                  <span className="text-[11px] font-semibold text-primary">{formatPrice(platformCommission)}</span>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep("pay")} className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow">
              Proceed to Pay {formatPrice(totalPayment)}
            </Button>
          </div>
        )}

        {/* Step 3: Pay */}
        {step === "pay" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-card p-5 text-center space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Pay to UPI ID</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-bold text-primary font-mono">{upiId}</p>
                <button onClick={copyUpi} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                  <Copy className="h-4 w-4 text-primary" />
                </button>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatPrice(totalPayment)}</p>
            </div>

            <Button onClick={openUpiApp} variant="outline" className="w-full rounded-xl py-5 text-sm font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <ExternalLink className="h-4 w-4" /> Open UPI App to Pay
            </Button>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold text-foreground mb-1">⚡ How to pay:</p>
              <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Open any UPI app (Google Pay, PhonePe, Paytm)</li>
                <li>Send <span className="font-bold text-foreground">{formatPrice(totalPayment)}</span> to <span className="font-bold text-foreground font-mono">{upiId}</span></li>
                <li>Copy the UTR/Transaction Reference Number</li>
                <li>Come back here and enter the UTR number</li>
              </ol>
            </div>

            <Button onClick={() => setStep("confirm")} className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow">
              I've Made the Payment
            </Button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">Enter Payment Reference</p>
              <p className="text-xs text-muted-foreground">Enter the UTR number or UPI Transaction ID from your payment app.</p>
              <Input
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="e.g. 412345678901 or UPI Ref Number"
                className="rounded-xl py-5 font-mono"
              />
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-verified/20 bg-verified/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
              <div>
                <p className="text-sm font-semibold text-foreground">Buyer Protection</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  Your payment will be verified and held in escrow. Funds are released to the seller only after you confirm {deliveryMethod === "shipping" ? "delivery" : "pickup"}.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Submit Button for confirm step */}
      {step === "confirm" && (
        <div className="fixed bottom-[var(--tab-bar-height)] left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-lg">
            <Button
              onClick={handleSubmitPayment}
              disabled={processing || !utrNumber.trim()}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-50"
            >
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <>Confirm Payment</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
