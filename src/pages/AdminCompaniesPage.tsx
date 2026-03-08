import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Check, X, Eye, Globe, Mail, Phone, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  brand_name: string;
  business_email: string;
  contact_phone: string;
  website: string;
  business_address: string;
  logo_url: string;
  verification_doc_url: string;
  status: string;
  rejection_reason: string;
  created_at: string;
}

const AdminCompaniesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    let query = supabase.from("company_profiles").select("*").order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data } = await query;
    setCompanies((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [filter]);

  const handleAction = async (companyId: string, action: "approved" | "rejected", reason?: string) => {
    setProcessing(companyId);
    try {
      const updateData: any = { status: action };
      if (reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from("company_profiles")
        .update(updateData)
        .eq("id", companyId);

      if (error) throw error;

      toast({
        title: action === "approved" ? "Company Approved ✓" : "Company Rejected",
        description: action === "approved" ? "The company can now list products." : "The company has been rejected.",
      });
      fetchCompanies();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
      setRejectionReason("");
    }
  };

  const filters = ["all", "pending", "approved", "rejected"] as const;

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-foreground">Company Applications</h1>
        </div>
      </header>

      {/* Filters */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-foreground">No {filter} applications</p>
          </div>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{company.company_name}</p>
                  {company.brand_name && <p className="text-xs text-muted-foreground">Brand: {company.brand_name}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  company.status === "approved" ? "bg-verified/10 text-verified" :
                  company.status === "rejected" ? "bg-destructive/10 text-destructive" :
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                }`}>
                  {company.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {company.business_email}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {company.contact_phone}</p>
                {company.website && <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> {company.website}</p>}
                <p className="text-[11px]">📍 {company.business_address}</p>
              </div>

              {company.verification_doc_url && (
                <a href={company.verification_doc_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Eye className="h-3.5 w-3.5" /> View Verification Document
                </a>
              )}

              {company.status === "rejected" && company.rejection_reason && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/5 border border-destructive/20 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{company.rejection_reason}</p>
                </div>
              )}

              {company.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => handleAction(company.id, "approved")}
                    disabled={processing === company.id}
                    className="flex-1 gap-1.5 rounded-xl bg-verified text-verified-foreground hover:bg-verified/90"
                    size="sm"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject {company.company_name}</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        rows={3}
                        className="rounded-xl"
                      />
                      <Button
                        onClick={() => handleAction(company.id, "rejected", rejectionReason)}
                        disabled={!rejectionReason}
                        variant="destructive"
                        className="rounded-xl"
                      >
                        Confirm Rejection
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">Applied: {new Date(company.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCompaniesPage;
