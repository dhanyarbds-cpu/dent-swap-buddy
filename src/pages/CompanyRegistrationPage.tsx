import { useState } from "react";
import { ArrowLeft, Building2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const CompanyRegistrationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    brandName: "",
    businessEmail: "",
    contactPhone: "",
    website: "",
    businessAddress: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
  };

  const uploadFile = async (file: File, path: string) => {
    const ext = file.name.split(".").pop();
    const filePath = `${path}/${user!.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("listing-images").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.companyName || !form.businessEmail || !form.contactPhone || !form.businessAddress) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let logoUrl = "";
      let docUrl = "";

      if (logoFile) {
        logoUrl = await uploadFile(logoFile, "company-logos");
      }
      if (docFile) {
        docUrl = await uploadFile(docFile, "company-docs");
      }

      const { error } = await supabase.from("company_profiles").insert({
        user_id: user.id,
        company_name: form.companyName,
        brand_name: form.brandName,
        business_email: form.businessEmail,
        contact_phone: form.contactPhone,
        website: form.website,
        business_address: form.businessAddress,
        logo_url: logoUrl,
        verification_doc_url: docUrl,
        status: "pending",
      } as any);

      if (error) throw error;

      toast({
        title: "Application Submitted! 🎉",
        description: "Your company registration is under review. You'll be notified once approved.",
      });
      navigate("/profile");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-foreground">Register as Company Seller</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg p-4 space-y-5 pb-32">
        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Company Seller Account</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Register your company to sell brand-new products. Your application will be reviewed before activation.
              Only durable equipment listings are allowed — no consumables.
            </p>
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Company Logo</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 transition hover:border-primary/30">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{logoFile ? logoFile.name : "Upload company logo"}</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
            </div>
            <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          </label>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Company Name *</label>
            <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="e.g. MedEquip India Pvt. Ltd." className="rounded-xl py-5" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Brand Name (if different)</label>
            <Input value={form.brandName} onChange={(e) => update("brandName", e.target.value)} placeholder="e.g. MedEquip" className="rounded-xl py-5" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Business Email *</label>
            <Input type="email" value={form.businessEmail} onChange={(e) => update("businessEmail", e.target.value)} placeholder="contact@company.com" className="rounded-xl py-5" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Contact Phone *</label>
            <Input type="tel" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="+91 98765 43210" className="rounded-xl py-5" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Company Website (optional)</label>
            <Input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://www.company.com" className="rounded-xl py-5" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Business Address *</label>
            <Textarea value={form.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} placeholder="Full business address" rows={3} className="rounded-xl" />
          </div>
        </div>

        {/* Verification Doc */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Business Verification Document (optional)</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 transition hover:border-primary/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{docFile ? docFile.name : "Upload document"}</p>
              <p className="text-xs text-muted-foreground">GST certificate, trade license, etc.</p>
            </div>
            <input type="file" accept="image/*,.pdf" onChange={handleDocSelect} className="hidden" />
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-[var(--tab-bar-height)] left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><Building2 className="h-4 w-4" /> Submit Application</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanyRegistrationPage;
