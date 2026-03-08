import { useState, ReactNode } from "react";
import { RotateCcw, Upload, X, Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReturnRequestDialogProps {
  children: ReactNode;
  orderId: string;
  listingId: string | null;
  sellerId: string;
  productName: string;
  orderPrice: number;
  sellerName: string;
  orderDate: string;
}

const RETURN_REASONS = [
  { value: "not_as_described", label: "Product not as described" },
  { value: "damaged", label: "Damaged product" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "no_longer_needed", label: "No longer needed" },
  { value: "other", label: "Other" },
];

const ReturnRequestDialog = ({
  children,
  orderId,
  listingId,
  sellerId,
  productName,
  orderPrice,
  sellerName,
  orderDate,
}: ReturnRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if within return window (7 days)
  const orderDateObj = new Date(orderDate);
  const daysSinceOrder = Math.floor((Date.now() - orderDateObj.getTime()) / (1000 * 60 * 60 * 24));
  const canReturn = daysSinceOrder <= 7;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + evidenceFiles.length > 5) {
      toast({ title: "Maximum 5 images allowed", variant: "destructive" });
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} is too large (max 5MB)`, variant: "destructive" });
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setEvidenceFiles((prev) => [...prev, ...newFiles]);
    setEvidencePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(evidencePreviews[index]);
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadEvidence = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of evidenceFiles) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("return-evidence").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("return-evidence").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      let evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        setUploading(true);
        evidenceUrls = await uploadEvidence();
        setUploading(false);
      }

      const { error } = await supabase.from("return_requests").insert({
        order_id: orderId,
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        reason,
        description: description.trim() || null,
        evidence_urls: evidenceUrls,
        refund_amount: orderPrice,
      });

      if (error) throw error;

      toast({
        title: "Return Request Submitted ✓",
        description: "The seller will be notified and review your request.",
      });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setReason("");
    setDescription("");
    evidencePreviews.forEach((url) => URL.revokeObjectURL(url));
    setEvidenceFiles([]);
    setEvidencePreviews([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) resetForm();
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-5 w-5 text-primary" />
            Request Return
          </DialogTitle>
        </DialogHeader>

        {!canReturn ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-foreground">Return Window Expired</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Returns can only be requested within 7 days of delivery. This order is {daysSinceOrder} days old.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Auto-filled Info */}
            <div className="rounded-xl bg-secondary/50 p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium text-foreground line-clamp-1 max-w-[180px]">{productName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-[10px] text-foreground">{orderId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Seller</span>
                <span className="font-medium text-foreground">{sellerName}</span>
              </div>
            </div>

            {/* Reason Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Return Reason <span className="text-destructive">*</span>
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description <span className="text-muted-foreground text-xs">(optional, max 500 chars)</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Explain the issue with your order..."
                className="min-h-[100px] resize-none rounded-xl"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{description.length}/500</p>
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Evidence <span className="text-muted-foreground text-xs">(photos/screenshots)</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {evidencePreviews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {evidenceFiles.length < 5 && (
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Upload up to 5 images as evidence (max 5MB each)
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading Evidence..." : "Submitting..."}
                </>
              ) : (
                "Submit Return Request"
              )}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground">
              By submitting, you agree to return the product in its original condition.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReturnRequestDialog;
