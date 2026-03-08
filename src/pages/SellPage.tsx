import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, Truck, ShieldAlert, ExternalLink, Building2, Wallet } from "lucide-react";
import { categories } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ImageUploader from "@/components/ImageUploader";
import VideoUploader from "@/components/VideoUploader";
import { useNavigate } from "react-router-dom";

const conditions = ["New", "Used"];
const steps = ["Category", "Photos", "Details", "Links & Price", "Delivery"];


const SellPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aiCondition, setAiCondition] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    condition: "",
    brand: "",
    price: "",
    description: "",
    location: "",
    hashtags: "",
    externalLink: "",
    negotiable: true,
    pickupAvailable: true,
    shippingAvailable: false,
    upiId: "",
    accountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    ifscCode: "",
  });

  // Load existing UPI ID
  useEffect(() => {
    if (!user) return;
    supabase
      .from("seller_payout_details")
      .select("upi_id")
      .eq("seller_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.upi_id) update("upiId", data.upi_id);
      });
  }, [user]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const canNext = () => {
    if (step === 0) return !!form.category;
    if (step === 1) return true;
    if (step === 2) return !!form.title && !!form.condition;
    if (step === 3) return !!form.price && parseFloat(form.price) >= 10;
    if (step === 4) return !!form.location && (form.pickupAvailable || form.shippingAvailable);
    return false;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (parseFloat(form.price) < 10) {
      toast({ title: "Price Too Low", description: "Minimum product price allowed is ₹10. Please update your listing.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const hashtags = form.hashtags
        .split(/[\s,]+/)
        .filter((t) => t.startsWith("#"))
        .map((t) => t.trim());

      const { data: listing, error } = await supabase.from("listings").insert({
        title: form.title,
        category: form.category,
        condition: form.condition,
        brand: form.brand,
        price: parseFloat(form.price),
        description: form.description,
        location: form.location,
        hashtags,
        images,
        is_negotiable: form.negotiable,
        seller_id: user.id,
        status: "active",
        pickup_available: form.pickupAvailable,
        shipping_available: form.shippingAvailable,
        external_link: form.externalLink || "",
      } as any).select("id").single();

      if (error) throw error;

      if (listing?.id) {
        supabase.functions.invoke("match-demands", {
          body: { listing_id: listing.id },
        }).catch(console.error);
      }

      // Save UPI ID to seller_payout_details
      if (form.upiId) {
        await supabase.from("seller_payout_details").upsert(
          { seller_id: user.id, upi_id: form.upiId, payout_method: "upi" },
          { onConflict: "seller_id" }
        );
      }

      toast({ title: "Listing Published! 🎉", description: "Your listing is now live." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const ToggleOption = ({ active, onToggle, icon: Icon, title, desc }: { active: boolean; onToggle: () => void; icon: any; title: string; desc: string }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all press-scale ${
        active ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${active ? "bg-primary" : "bg-muted"}`}>
        <div className={`h-5 w-5 rounded-full bg-primary-foreground shadow-sm transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  );

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
           <h1 className="flex-1 text-lg font-bold text-foreground">Post Your Ad</h1>
           <button onClick={() => navigate("/company-sell")} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20">
             <Building2 className="h-3 w-3" /> Company
           </button>
           <span className="text-xs font-medium text-muted-foreground">{step + 1}/{steps.length}</span>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-lg p-4 animate-fade-in" key={step}>
        {/* Step 0: Category */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold text-foreground">Select a Category</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose the best category for your listing</p>
            </div>

            {/* Policy Notice */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Listing Policy</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                  All medical, dental, laboratory, and educational products — including consumables and disposables — can be listed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((c) => (
                <button
                  key={c.name}
                  onClick={() => update("category", c.name)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 press-scale ${
                    form.category === c.name
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card dentzap-card-shadow hover:dentzap-card-shadow-hover"
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-medium text-foreground leading-tight">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="space-y-6">
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={5}
              onConditionDetected={(rating) => setAiCondition(rating)}
            />
            <VideoUploader
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
              listingTitle={form.title}
            />
            {aiCondition && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 animate-fade-in">
                <p className="text-xs text-muted-foreground">
                  AI detected condition: <span className="font-bold text-foreground">{aiCondition}</span>
                  {form.condition && aiCondition !== form.condition && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">(differs from your selection)</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold text-foreground">Add Details</p>
              <p className="mt-1 text-sm text-muted-foreground">Help buyers find your listing</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value.slice(0, 80))}
                  placeholder="e.g. Complete BDS Instrument Kit"
                  className="rounded-xl py-5"
                  maxLength={80}
                />
                <p className="mt-1 text-[11px] text-muted-foreground text-right">{form.title.length}/80</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Condition</label>
                <div className="flex gap-3">
                  {conditions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update("condition", c)}
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all press-scale ${
                        form.condition === c
                          ? "dentzap-gradient border-transparent text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Brand / Manufacturer</label>
                <Input
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                  placeholder="e.g. GDC, NSK, Hu-Friedy"
                  className="rounded-xl py-5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value.slice(0, 500))}
                  placeholder="Describe condition, usage history, what's included..."
                  rows={4}
                  className="rounded-xl"
                  maxLength={500}
                />
                <p className="mt-1 text-[11px] text-muted-foreground text-right">{form.description.length}/500</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Links & Price */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold text-foreground">Links & Price</p>
              <p className="mt-1 text-sm text-muted-foreground">Add optional links and set your price</p>
            </div>

            {/* External Link */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">External Link (optional)</label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  value={form.externalLink}
                  onChange={(e) => update("externalLink", e.target.value)}
                  placeholder="https://example.com/product-demo"
                  className="rounded-xl py-5 pl-10"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Product demo video, website, or additional info</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Price (₹)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="0"
                className="rounded-xl py-6 text-xl font-bold"
              />
            </div>
            <ToggleOption
              active={form.negotiable}
              onToggle={() => update("negotiable", !form.negotiable)}
              icon={MapPin}
              title="Negotiable"
              desc="Allow buyers to negotiate the price"
            />

            {/* Payout Details */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Payout Details (Admin only)</p>
              
              {/* UPI ID */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">UPI ID</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.upiId}
                    onChange={(e) => update("upiId", e.target.value.trim())}
                    placeholder="e.g. yourname@upi"
                    className="rounded-xl py-5 pl-10"
                  />
                </div>
              </div>

              {/* Bank Account Details */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Account Holder Name</label>
                <Input
                  value={form.accountHolderName}
                  onChange={(e) => update("accountHolderName", e.target.value)}
                  placeholder="e.g. John Doe"
                  className="rounded-xl py-5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Bank Name</label>
                <Input
                  value={form.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="rounded-xl py-5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Account Number</label>
                  <Input
                    value={form.bankAccountNumber}
                    onChange={(e) => update("bankAccountNumber", e.target.value)}
                    placeholder="Account number"
                    className="rounded-xl py-5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">IFSC Code</label>
                  <Input
                    value={form.ifscCode}
                    onChange={(e) => update("ifscCode", e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    className="rounded-xl py-5"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">Only visible to you and platform admin for payouts. Provide UPI or bank details (or both).</p>
            </div>

            {/* Commission Info */}
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
              <span className="text-base">💡</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A small platform commission (1.5%–2%) is charged on successful sales above ₹100. This helps keep the platform secure and running smoothly.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Delivery & Location */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold text-foreground">Location & Delivery</p>
              <p className="mt-1 text-sm text-muted-foreground">Where is the item available and how can it be delivered?</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">City / Area</label>
              <Input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Mumbai, Maharashtra"
                className="rounded-xl py-5"
              />
            </div>

            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Delivery Options</p>
              <div className="space-y-3">
                <ToggleOption
                  active={form.pickupAvailable}
                  onToggle={() => update("pickupAvailable", !form.pickupAvailable)}
                  icon={MapPin}
                  title="Local Pickup"
                  desc="Buyer picks up from your location"
                />
                <ToggleOption
                  active={form.shippingAvailable}
                  onToggle={() => update("shippingAvailable", !form.shippingAvailable)}
                  icon={Truck}
                  title="Shipping Available"
                  desc="Ship via courier (cost negotiated in chat)"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Tags (optional)</label>
              <Input
                value={form.hashtags}
                onChange={(e) => update("hashtags", e.target.value)}
                placeholder="#DentalInstruments #BDSKit"
                className="rounded-xl py-5"
              />
            </div>

            {/* Safety Tips */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Safety Tips for Sellers</p>
              </div>
              <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400/80">
                <li>• Meet buyers in public places for local pickups</li>
                <li>• Use trusted courier services for shipping</li>
                <li>• Share tracking details with the buyer</li>
                <li>• Package items securely before shipping</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-[var(--tab-bar-height)] left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-40"
            >
              {submitting ? (
                <>Publishing...</>
              ) : (
                <><Check className="h-4 w-4" /> Publish Listing</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellPage;
