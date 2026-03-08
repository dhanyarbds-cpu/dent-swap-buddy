import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle, MapPin, Truck, Smartphone, QrCode, Copy, ExternalLink } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState<"upi_qr" | "upi_id">("upi_qr");
  const [upiQrData, setUpiQrData] = useState<{ order_id: string; upi_uri: string; upi_id: string; amount: number; txn_ref: string; product_name?: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [qrUtrNumber, setQrUtrNumber] = useState("");
  const [qrVerifyStep, setQrVerifyStep] = useState(false);
  const [submittingQrUtr, setSubmittingQrUtr] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const handleUpiQrPayment = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-upi-qr-order", {
        body: {
          listing_id: listing.id,
          amount: listing.price,
          delivery_method: deliveryMethod,
          shipping_address: deliveryMethod === "shipping" ? shippingAddress : null,
        },
      });

      if (error || !data?.upi_uri) {
        throw new Error(data?.error || error?.message || "Failed to create UPI order");
      }

      setUpiQrData(data);
      setShowQrModal(true);

      setTimeout(() => {
        if (qrCanvasRef.current) {
          generateQrCode(qrCanvasRef.current, data.upi_uri);
        }
      }, 100);
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const generateQrCode = (canvas: HTMLCanvasElement, text: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 250;
        canvas.height = 250;
        ctx.drawImage(img, 0, 0, 250, 250);
      }
    };
  };

  const copyUpiId = () => {
    if (upiQrData?.upi_id) {
      navigator.clipboard.writeText(upiQrData.upi_id);
      toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
    }
  };

  const handleUpiIdPayment = async () => {
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
        throw new Error(data?.error || error?.message || "Failed to create UPI order");
      }
      toast({ title: "Order Placed! 🎉", description: "Payment will be verified by admin." });
      navigate(`/orders?payment=pending_verification&order_id=${data.order_id}`);
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handlePayment = () => {
    if (paymentMethod === "upi_qr") {
      handleUpiQrPayment();
    } else {
      handleUpiIdPayment();
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

        {/* Step 3: Choose Payment Method & Pay */}
        {step === "pay" && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold text-foreground mb-3">Choose Payment Method</p>
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod("upi_qr")}
                  className={`w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                    paymentMethod === "upi_qr" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${paymentMethod === "upi_qr" ? "bg-primary/10" : "bg-secondary"}`}>
                    <QrCode className={`h-5 w-5 ${paymentMethod === "upi_qr" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">UPI QR Code</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Scan QR with any UPI app — GPay, PhonePe, Paytm</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded-full bg-verified/10 px-2 py-0.5 text-[10px] font-semibold text-verified">Recommended</span>
                      <span className="text-[10px] text-muted-foreground">No gateway fees</span>
                    </div>
                  </div>
                  {paymentMethod === "upi_qr" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                </button>

                <button
                  onClick={() => setPaymentMethod("upi_id")}
                  className={`w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                    paymentMethod === "upi_id" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${paymentMethod === "upi_id" ? "bg-primary/10" : "bg-secondary"}`}>
                    <Smartphone className={`h-5 w-5 ${paymentMethod === "upi_id" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">UPI ID / UTR</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Pay via UPI to our ID and enter UTR number</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded-full bg-verified/10 px-2 py-0.5 text-[10px] font-semibold text-verified">Manual</span>
                      <span className="text-[10px] text-muted-foreground">Admin verified</span>
                    </div>
                  </div>
                  {paymentMethod === "upi_id" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                </button>
              </div>
            </div>

            {/* UPI ID / UTR input section */}
            {paymentMethod === "upi_id" && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-fade-in">
                <div className="rounded-xl bg-secondary/50 px-4 py-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pay to UPI ID</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">kharmugilanr2005@oksbi</p>
                    <button onClick={() => { navigator.clipboard.writeText("kharmugilanr2005@oksbi"); toast({ title: "Copied!", description: "UPI ID copied" }); }} className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">UTR / Transaction Reference</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter 12-digit UTR number after payment"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    maxLength={30}
                  />
                  <p className="mt-1.5 text-[10px] text-muted-foreground">Find UTR in your UPI app's payment history</p>
                </div>
              </div>
            )}

            {/* Security info */}
            <div className="flex items-start gap-3 rounded-2xl border border-verified/20 bg-verified/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
              <div>
                <p className="text-sm font-semibold text-foreground">Buyer Protection</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  Payment is held securely. Funds are released to the seller only after you confirm {deliveryMethod === "shipping" ? "delivery" : "pickup"}.
                </p>
              </div>
            </div>

            {/* Pay button */}
            <Button
              onClick={handlePayment}
              disabled={processing || (paymentMethod === "upi_id" && !utrNumber.trim())}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-50"
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : paymentMethod === "upi_qr" ? (
                <><QrCode className="h-4 w-4" /> Generate UPI QR — {formatPrice(totalPayment)}</>
              ) : (
                <><Smartphone className="h-4 w-4" /> Submit UTR — {formatPrice(totalPayment)}</>
              )}
            </Button>
          </div>
        )}
      </main>

      {/* UPI QR Code Modal */}
      {showQrModal && upiQrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 space-y-5 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <QrCode className="h-7 w-7 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">Scan to Pay</p>
              <p className="mt-1 text-sm text-muted-foreground">Scan with any UPI app</p>
            </div>

            <div className="flex justify-center">
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-white p-3">
                <canvas ref={qrCanvasRef} className="h-[250px] w-[250px]" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{formatPrice(upiQrData.amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{upiQrData.product_name || "DentSwap Order"}</p>
            </div>

            <div className="rounded-xl bg-secondary/50 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">UPI ID</span>
                <button onClick={copyUpiId} className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <p className="text-sm font-bold text-foreground">{upiQrData.upi_id}</p>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Ref: {upiQrData.txn_ref}</span>
              </div>
            </div>

            <a
              href={upiQrData.upi_uri}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
            >
              <ExternalLink className="h-4 w-4" /> Open UPI App
            </a>

            {!qrVerifyStep ? (
              <>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setShowQrModal(false); setUpiQrData(null); setQrVerifyStep(false); setQrUtrNumber(""); }}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setQrVerifyStep(true)}
                    className="flex-1 rounded-xl dentzap-gradient text-primary-foreground"
                  >
                    Done Paying? Verify →
                  </Button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
                  After paying, tap "Verify" to enter your UTR number for confirmation.
                </p>
              </>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="text-sm font-bold text-foreground">Enter UTR / Transaction Reference</p>
                  <p className="text-xs text-muted-foreground">Find the UTR number in your UPI app's payment history or transaction receipt.</p>
                  <input
                    type="text"
                    value={qrUtrNumber}
                    onChange={(e) => setQrUtrNumber(e.target.value)}
                    placeholder="Enter 12-digit UTR number"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    maxLength={30}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setQrVerifyStep(false); setQrUtrNumber(""); }}
                    className="flex-1 rounded-xl"
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!qrUtrNumber.trim() || submittingQrUtr}
                    onClick={async () => {
                      setSubmittingQrUtr(true);
                      try {
                        const { error } = await supabase
                          .from("orders")
                          .update({ razorpay_payment_id: qrUtrNumber.trim(), status: "pending_upi_verification" })
                          .eq("id", upiQrData.order_id);
                        if (error) throw error;
                        toast({ title: "UTR Submitted! ✓", description: "Your payment is being verified by admin." });
                        navigate(`/orders?payment=pending_verification&order_id=${upiQrData.order_id}`);
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message, variant: "destructive" });
                      }
                      setSubmittingQrUtr(false);
                    }}
                    className="flex-1 rounded-xl dentzap-gradient text-primary-foreground"
                  >
                    {submittingQrUtr ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Submit UTR"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
