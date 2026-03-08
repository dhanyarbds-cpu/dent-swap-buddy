import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, CreditCard, Smartphone, Building2, Loader2, CheckCircle, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

const paymentMethods = [
  { id: "upi", label: "UPI", desc: "Google Pay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Card", desc: "Debit / Credit Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", desc: "All major banks", icon: Building2 },
];

const CheckoutPage = ({ listing, onBack }: CheckoutPageProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [commissionInfo, setCommissionInfo] = useState<{ rate: number; buyer_fee_rate: number; min_price: number } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "commission")
        .single();
      if (data?.value) setCommissionInfo(data.value as any);
    };
    fetchSettings();
  }, []);

  const buyerFeeRate = commissionInfo?.buyer_fee_rate ?? 1;
  const commissionRate = commissionInfo?.rate ?? 1;
  const buyerServiceFee = Math.round((listing.price * buyerFeeRate) / 100 * 100) / 100;
  const platformCommission = Math.round((listing.price * commissionRate) / 100 * 100) / 100;
  const sellerGets = Math.round((listing.price - platformCommission) * 100) / 100;
  const totalPayment = Math.round((listing.price + buyerServiceFee) * 100) / 100;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) return;
    setProcessing(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway");

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: { listing_id: listing.id, amount: listing.price },
      });

      if (error || !data?.razorpay_order_id) {
        throw new Error(data?.error || error?.message || "Failed to create order");
      }

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: "DentSwap",
        description: listing.title,
        order_id: data.razorpay_order_id,
        prefill: {
          email: user.email,
          name: profile?.full_name || "",
          contact: profile?.phone || "",
        },
        theme: { color: "#0F4C81" },
        method: {
          upi: selectedMethod === "upi",
          card: selectedMethod === "card",
          netbanking: selectedMethod === "netbanking",
          wallet: false,
          paylater: false,
        },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: data.order_id,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || "Verification failed");
            }

            setPaymentSuccess(true);
            toast({ title: "Payment Successful! 🎉", description: "Funds are held securely until you confirm delivery." });
          } catch (err: any) {
            toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
          }
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="safe-bottom flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-verified/10 animate-fade-in">
          <CheckCircle className="h-10 w-10 text-verified" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-foreground">Payment Successful!</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
          Your payment is held securely in escrow. Funds will be released to the seller once you confirm delivery.
        </p>
        <div className="mt-6 w-full max-w-xs space-y-3">
          <Button
            onClick={() => navigate("/orders")}
            className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
          >
            <Package className="mr-2 h-4 w-4" /> View My Orders
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="w-full rounded-xl py-5 text-sm"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const img = listing.images?.[0];

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Checkout</h1>
        <div className="flex items-center gap-1 text-[10px] font-medium text-verified">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-5 animate-fade-in">
        {/* Order Summary */}
        <div className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Order Summary</p>
          <div className="flex gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
              {img ? (
                <img src={img} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xl">🦷</div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground line-clamp-2">{listing.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {listing.condition} · {listing.category}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Seller: {listing.seller.name}
              </p>
            </div>
          </div>

          {/* Price Breakdown - 3-way model */}
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Product Price</span>
              <span className="text-sm font-medium text-foreground">{formatPrice(listing.price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                Buyer Service Fee
                <span className="text-[10px] text-muted-foreground/60">({buyerFeeRate}%)</span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">+{formatPrice(buyerServiceFee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-border pt-2">
              <span className="text-sm font-semibold text-foreground">Total Payment</span>
              <span className="text-lg font-bold text-foreground">{formatPrice(totalPayment)}</span>
            </div>
          </div>

          {/* Distribution info */}
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
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Service fee</span>
              <span className="text-[11px] font-semibold text-amber-600">{formatPrice(buyerServiceFee)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Payment Method</p>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 transition-all press-scale ${
                  selectedMethod === method.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  selectedMethod === method.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  <method.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{method.label}</p>
                  <p className="text-[11px] text-muted-foreground">{method.desc}</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 ${
                  selectedMethod === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {selectedMethod === method.id && (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Escrow Info */}
        <div className="flex items-start gap-3 rounded-2xl border border-verified/20 bg-verified/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
          <div>
            <p className="text-sm font-semibold text-foreground">Buyer Protection</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Your payment is held securely in escrow. Funds are released to the seller only after you confirm receiving the product.
            </p>
          </div>
        </div>
      </main>

      {/* Pay Button */}
      <div className="fixed bottom-[var(--tab-bar-height)] left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-50"
          >
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <>Pay {formatPrice(totalPayment)} Securely</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
