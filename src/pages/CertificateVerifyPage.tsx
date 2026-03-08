import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Copy, CheckCircle2, XCircle, Loader2, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CertificateVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const certId = searchParams.get("id");
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!certId) { setLoading(false); return; }
    supabase
      .from("product_certificates")
      .select("*")
      .eq("id", certId)
      .single()
      .then(({ data }) => {
        setCert(data);
        setLoading(false);
      });
  }, [certId]);

  const handleVerify = async () => {
    if (!cert) return;
    setVerifying(true);
    // Re-compute hash client-side to verify integrity
    const hashPayload = JSON.stringify({
      listing_id: cert.listing_id,
      product_name: cert.product_name,
      brand: cert.brand,
      condition: cert.condition,
      seller_id: cert.seller_id,
      seller_name: cert.seller_name,
      issued_at: cert.issued_at,
      previous_hash: cert.previous_hash,
    });
    const enc = new TextEncoder().encode(hashPayload);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const computedHash = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
    
    setVerified(computedHash === cert.certificate_hash);
    setVerifying(false);
  };

  const copyHash = () => {
    navigator.clipboard.writeText(cert?.certificate_hash || "");
    toast.success("Hash copied to clipboard");
  };

  const shareUrl = `${window.location.origin}/verify-certificate?id=${certId}`;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-background p-4">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col items-center gap-4 pt-20">
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Certificate Not Found</h1>
          <p className="text-sm text-muted-foreground text-center">This certificate ID does not exist or has been invalidated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h1 className="text-lg font-bold text-foreground">Authenticity Certificate</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        {/* Certificate Card */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-card to-emerald-50/50 p-6 dark:from-emerald-950/20 dark:via-card dark:to-emerald-950/10">
          {/* Watermark */}
          <div className="absolute -right-6 -top-6 opacity-5">
            <ShieldCheck className="h-40 w-40 text-emerald-500" />
          </div>

          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">VERIFIED AUTHENTIC</p>
                  <p className="text-[10px] text-muted-foreground">DentSwap Certificate</p>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Product</p>
                <p className="text-sm font-semibold text-foreground">{cert.product_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Brand</p>
                  <p className="text-sm font-medium text-foreground">{cert.brand || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Condition</p>
                  <p className="text-sm font-medium text-foreground capitalize">{cert.condition}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seller</p>
                  <p className="text-sm font-medium text-foreground">{cert.seller_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Issued</p>
                  <p className="text-sm font-medium text-foreground">{new Date(cert.issued_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            </div>

            {/* Hash */}
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SHA-256 Hash</p>
                <button onClick={copyHash} className="text-primary">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground break-all leading-relaxed">{cert.certificate_hash}</p>
            </div>

            {/* Chain link */}
            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Previous Chain Hash</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">{cert.previous_hash === "GENESIS" ? "🔗 GENESIS BLOCK" : cert.previous_hash}</p>
            </div>
          </div>
        </div>

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full gap-2 rounded-xl py-6 text-sm font-semibold"
          variant={verified === true ? "default" : verified === false ? "destructive" : "default"}
        >
          {verifying ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Verifying Integrity...</>
          ) : verified === true ? (
            <><CheckCircle2 className="h-4 w-4" /> ✅ Certificate Integrity Verified</>
          ) : verified === false ? (
            <><XCircle className="h-4 w-4" /> ❌ Integrity Check Failed — Tampered</>
          ) : (
            <><ShieldCheck className="h-4 w-4" /> Verify Certificate Integrity</>
          )}
        </Button>

        {/* Share */}
        <Button
          variant="outline"
          className="w-full gap-2 rounded-xl"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Verification link copied!");
          }}
        >
          <ExternalLink className="h-4 w-4" /> Copy Verification Link
        </Button>
      </div>
    </div>
  );
};

export default CertificateVerifyPage;
