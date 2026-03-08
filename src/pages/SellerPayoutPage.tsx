import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, CheckCircle, Building2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const SellerPayoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [form, setForm] = useState({
    upi_id: "",
    account_holder_name: "",
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
  });
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("seller_payout_details" as any)
        .select("*")
        .eq("seller_id", user.id)
        .maybeSingle();
      if (data) {
        setExistingId((data as any).id);
        setMethod((data as any).payout_method === "bank" ? "bank" : "upi");
        setForm({
          upi_id: (data as any).upi_id || "",
          account_holder_name: (data as any).account_holder_name || "",
          bank_name: (data as any).bank_name || "",
          bank_account_number: (data as any).bank_account_number || "",
          ifsc_code: (data as any).ifsc_code || "",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        seller_id: user.id,
        payout_method: method,
        upi_id: method === "upi" ? form.upi_id : null,
        account_holder_name: form.account_holder_name,
        bank_name: method === "bank" ? form.bank_name : null,
        bank_account_number: method === "bank" ? form.bank_account_number : null,
        ifsc_code: method === "bank" ? form.ifsc_code : null,
      };

      if (existingId) {
        const { error } = await supabase
          .from("seller_payout_details" as any)
          .update(payload as any)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seller_payout_details" as any)
          .insert(payload as any);
        if (error) throw error;
      }

      toast({ title: "Payout Details Saved ✓", description: "Your payout information has been updated." });
      navigate(-1);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const isValid = method === "upi"
    ? !!form.upi_id && !!form.account_holder_name
    : !!form.account_holder_name && !!form.bank_name && !!form.bank_account_number && !!form.ifsc_code;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Payout Details</h1>
        {existingId && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-verified">
            <CheckCircle className="h-3 w-3" /> Saved
          </span>
        )}
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-5 animate-fade-in">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Setup Required</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            You must register your payout details before you can receive payments from sales. Funds will be transferred to this account after buyer confirms delivery.
          </p>
        </div>

        {/* Method Selection */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Payout Method</p>
          <div className="flex gap-3">
            {[
              { id: "upi" as const, label: "UPI", icon: Smartphone },
              { id: "bank" as const, label: "Bank Transfer", icon: Building2 },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex flex-1 items-center gap-2 rounded-2xl border p-4 transition-all press-scale ${
                  method === m.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
                }`}
              >
                <m.icon className={`h-5 w-5 ${method === m.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${method === m.id ? "text-primary" : "text-foreground"}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Account Holder Name</label>
            <Input
              value={form.account_holder_name}
              onChange={(e) => setForm((f) => ({ ...f, account_holder_name: e.target.value }))}
              placeholder="Full name as per bank/UPI"
              className="rounded-xl py-5"
            />
          </div>

          {method === "upi" ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">UPI ID</label>
              <Input
                value={form.upi_id}
                onChange={(e) => setForm((f) => ({ ...f, upi_id: e.target.value }))}
                placeholder="e.g. name@upi, name@paytm"
                className="rounded-xl py-5"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Bank Name</label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  placeholder="e.g. State Bank of India"
                  className="rounded-xl py-5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Account Number</label>
                <Input
                  value={form.bank_account_number}
                  onChange={(e) => setForm((f) => ({ ...f, bank_account_number: e.target.value }))}
                  placeholder="Enter account number"
                  className="rounded-xl py-5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">IFSC Code</label>
                <Input
                  value={form.ifsc_code}
                  onChange={(e) => setForm((f) => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234"
                  className="rounded-xl py-5"
                />
              </div>
            </>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow disabled:opacity-50"
        >
          {saving ? "Saving..." : existingId ? "Update Payout Details" : "Save Payout Details"}
        </Button>
      </main>
    </div>
  );
};

export default SellerPayoutPage;
