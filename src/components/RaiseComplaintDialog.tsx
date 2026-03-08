import { useState } from "react";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const complaintCategories = [
  { value: "damaged", label: "Damaged product received" },
  { value: "not_as_described", label: "Product not as described" },
  { value: "fake_defective", label: "Fake or defective item" },
  { value: "seller_unresponsive", label: "Seller refusing to respond" },
  { value: "other", label: "Other issue" },
];

interface RaiseComplaintDialogProps {
  orderId: string;
  listingId: string | null;
  sellerId: string;
  productName: string;
  children: React.ReactNode;
}

const RaiseComplaintDialog = ({
  orderId,
  listingId,
  sellerId,
  productName,
  children,
}: RaiseComplaintDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + proofFiles.length > 5) {
      toast({ title: "Max 5 files allowed", variant: "destructive" });
      return;
    }
    setProofFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (idx: number) => {
    setProofFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!category || !description.trim() || !user) return;
    setSubmitting(true);

    try {
      // Upload proof files
      const proofUrls: string[] = [];
      for (const file of proofFiles) {
        const ext = file.name.split(".").pop();
        const path = `complaints/${orderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("listing-images")
            .getPublicUrl(path);
          proofUrls.push(urlData.publicUrl);
        }
      }

      // Insert complaint
      const { error } = await supabase.from("complaints").insert({
        order_id: orderId,
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        category,
        description: description.trim(),
        proof_urls: proofUrls,
      });

      if (error) throw error;

      // Trigger AI analysis
      await supabase.functions.invoke("analyze-complaint", {
        body: { seller_id: sellerId, order_id: orderId },
      });

      toast({ title: "Complaint Submitted ✓", description: "We'll review your complaint and notify the seller." });
      setOpen(false);
      setCategory("");
      setDescription("");
      setProofFiles([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Raise a Complaint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Product info */}
          <div className="rounded-xl bg-secondary/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Product</p>
            <p className="text-sm font-semibold text-foreground">{productName}</p>
          </div>

          {/* Category */}
          <div>
            <Label className="mb-1.5 block text-sm">Complaint Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {complaintCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1.5 block text-sm">Describe the issue *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what went wrong with the product..."
              className="rounded-xl min-h-[100px]"
              maxLength={1000}
            />
            <p className="mt-1 text-[10px] text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          {/* Photo proof */}
          <div>
            <Label className="mb-1.5 block text-sm">Upload proof (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {proofFiles.map((file, idx) => (
                <div key={idx} className="relative h-16 w-16 rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {proofFiles.length < 5 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Max 5 files</p>
          </div>

          {/* Safety message */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-[11px] text-amber-700 dark:text-amber-400">
            Our platform actively monitors seller behavior. Sellers who repeatedly violate rules will be permanently removed.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!category || !description.trim() || submitting}
            className="w-full rounded-xl py-5 text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              "Submit Complaint"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RaiseComplaintDialog;
