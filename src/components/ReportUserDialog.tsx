import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const reportReasons = [
  { value: "scam_fraud", label: "Scam or Fraud" },
  { value: "spam", label: "Spam / Repetitive Messages" },
  { value: "harassment", label: "Harassment or Abuse" },
  { value: "fake_identity", label: "Fake Identity / Impersonation" },
  { value: "suspicious_links", label: "Suspicious Links" },
  { value: "advance_payment", label: "Asking for Advance Payment" },
  { value: "other", label: "Other" },
];

interface ReportUserDialogProps {
  reportedUserId: string;
  reportedUserName: string;
  listingId?: string;
  children: React.ReactNode;
}

const ReportUserDialog = ({ reportedUserId, reportedUserName, listingId, children }: ReportUserDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || !description.trim() || !user) return;
    if (user.id === reportedUserId) {
      toast({ title: "You cannot report yourself", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("complaints").insert({
        listing_id: listingId || null,
        buyer_id: user.id,
        seller_id: reportedUserId,
        category,
        description: description.trim(),
      } as any);

      if (error) throw error;

      await supabase.functions.invoke("analyze-complaint", {
        body: { seller_id: reportedUserId },
      });

      toast({ title: "Report Submitted ✓", description: "We'll review this report and take appropriate action." });
      setOpen(false);
      setCategory("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="h-5 w-5 text-destructive" />
            Report User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-xl bg-secondary/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Reporting</p>
            <p className="text-sm font-semibold text-foreground">{reportedUserName}</p>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Reason *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Details *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="rounded-xl min-h-[80px]"
              maxLength={500}
            />
            <p className="mt-1 text-[10px] text-muted-foreground text-right">{description.length}/500</p>
          </div>

          <div className="rounded-xl bg-accent/50 px-3 py-2.5 text-[11px] text-muted-foreground">
            🔒 Your identity will remain private. We review all reports and take action against confirmed violations.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!category || !description.trim() || submitting}
            className="w-full rounded-xl py-5 text-sm font-semibold"
            variant="destructive"
          >
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUserDialog;
