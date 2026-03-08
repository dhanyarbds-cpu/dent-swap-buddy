import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, ShieldAlert, Building2 } from "lucide-react";
import { categories } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ImageUploader from "@/components/ImageUploader";
import { useNavigate } from "react-router-dom";


const steps = ["Category", "Photos", "Details", "Price"];

const CompanySellPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    category: "",
    brand: "",
    price: "",
    description: "",
    externalLink: "",
  });

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      setCompanyProfile(data);
      setLoading(false);
    };
    fetchCompany();
  }, [user]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const canNext = () => {
    if (step === 0) return !!form.category;
    if (step === 1) return images.length > 0;
    if (step === 2) return !!form.title;
    if (step === 3) return !!form.price && parseFloat(form.price) >= 10;
    return false;
  };

  const handleSubmit = async () => {
    if (!user || !companyProfile) return;

    if (parseFloat(form.price) < 10) {
      toast({ title: "Price Too Low", description: "Minimum product price allowed is ₹10. Please update your listing.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("listings").insert({
        title: form.title,
        category: form.category,
        condition: "New",
        brand: form.brand || companyProfile.brand_name || companyProfile.company_name,
        price: parseFloat(form.price),
        description: form.description,
        location: companyProfile.business_address,
        images,
        is_negotiable: false,
        seller_id: user.id,
        status: "active",
        pickup_available: true,
        shipping_available: true,
        external_link: form.externalLink || "",
        seller_type: "company",
        company_profile_id: companyProfile.id,
      } as any);

      if (error) throw error;

      toast({ title: "Product Published! 🎉", description: "Your company product is now live." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!companyProfile) {
    return (
      <div className="safe-bottom min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="flex-1 text-lg font-bold text-foreground">Company Listing</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-bold text-foreground">No Approved Company Account</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            You need an approved company account to list products as a company seller.
          </p>
          <Button onClick={() => navigate("/register-company")} className="mt-6 dentzap-gradient rounded-xl text-primary-foreground">
            Register as Company Seller
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="flex-1 text-lg font-bold text-foreground">Company Product Listing</h1>
          <span className="text-xs font-medium text-muted-foreground">{step + 1}/{steps.length}</span>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
      </header>

      {/* Company Info Bar */}
      <div className="mx-auto max-w-lg px-4 pt-3">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          {companyProfile.logo_url ? (
            <img src={companyProfile.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{companyProfile.company_name}</p>
            <p className="text-[11px] text-primary font-medium">Official Company Seller</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4 animate-fade-in" key={step}>
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold text-foreground">Select a Category</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose the best category for your product</p>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All medical, dental, laboratory, and educational products — including consumables and disposables — can be listed.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((c) => (
                <button
                  key={c.name}
                  onClick={() => update("category", c.name)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all press-scale ${
                    form.category === c.name ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-medium text-foreground leading-tight">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && <ImageUploader images={images} onImagesChange={setImages} maxImages={10} />}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold text-foreground">Product Details</p>
              <p className="mt-1 text-sm text-muted-foreground">Condition is automatically set to "New" for company listings</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Product Name</label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value.slice(0, 80))} placeholder="e.g. Digital X-Ray Sensor" className="rounded-xl py-5" maxLength={80} />
                <p className="mt-1 text-[11px] text-muted-foreground text-right">{form.title.length}/80</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Condition</label>
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">New (Auto-set for Company Listings)</div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Brand / Manufacturer</label>
                <Input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder={companyProfile.brand_name || "Brand name"} className="rounded-xl py-5" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value.slice(0, 500))} placeholder="Describe the product features, specifications..." rows={4} className="rounded-xl" maxLength={500} />
                <p className="mt-1 text-[11px] text-muted-foreground text-right">{form.description.length}/500</p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold text-foreground">Price & Links</p>
              <p className="mt-1 text-sm text-muted-foreground">Set product price and optional links</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">External Product Link (optional)</label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="url" value={form.externalLink} onChange={(e) => update("externalLink", e.target.value)} placeholder="https://company.com/product" className="rounded-xl py-5 pl-10" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Price (₹)</label>
              <Input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="0" className="rounded-xl py-6 text-xl font-bold" />
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
              <span className="text-base">💡</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A small platform commission (1.5%–2%) is charged on successful sales above ₹100.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[var(--tab-bar-height)] left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-40">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext() || submitting} className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-40">
              {submitting ? <>Publishing...</> : <><Check className="h-4 w-4" /> Publish Product</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanySellPage;
