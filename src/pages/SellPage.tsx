import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, Truck, ShieldAlert } from "lucide-react";
import { categories } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ImageUploader from "@/components/ImageUploader";
import { useNavigate } from "react-router-dom";

const conditions = ["New", "Used"];
const steps = ["Category", "Photos", "Details", "Price", "Delivery"];

const SellPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    category: "",
    condition: "",
    brand: "",
    price: "",
    description: "",
    location: "",
    hashtags: "",
    negotiable: true,
    pickupAvailable: true,
    shippingAvailable: false,
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const canNext = () => {
    if (step === 0) return !!form.category;
    if (step === 1) return true;
    if (step === 2) return !!form.title && !!form.condition;
    if (step === 3) return !!form.price;
    if (step === 4) return !!form.location && (form.pickupAvailable || form.shippingAvailable);
    return false;
  };

  const handleSubmit = async () => {
    if (!user) return;
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
      }).select("id").single();

      if (error) throw error;

      if (listing?.id) {
        supabase.functions.invoke("match-demands", {
          body: { listing_id: listing.id },
        }).catch(console.error);
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
          <ImageUploader images={images} onImagesChange={setImages} maxImages={8} />
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
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. Complete BDS Instrument Kit"
                  className="rounded-xl py-5"
                />
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
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe condition, usage history, what's included..."
                  rows={4}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Price */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold text-foreground">Set Your Price</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose a competitive price</p>
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
