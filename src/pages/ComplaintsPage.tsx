import { useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, Loader2, MessageSquare, CheckCircle, Clock, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/mockData";

interface Complaint {
  id: string;
  order_id: string;
  category: string;
  description: string;
  proof_urls: string[];
  status: string;
  seller_response: string | null;
  seller_responded_at: string | null;
  resolution: string | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
}

const categoryLabels: Record<string, string> = {
  damaged: "Damaged product",
  not_as_described: "Not as described",
  fake_defective: "Fake or defective",
  seller_unresponsive: "Seller unresponsive",
  other: "Other issue",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Open", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  responded: { label: "Seller Responded", color: "bg-primary/10 text-primary", icon: MessageSquare },
  resolved: { label: "Resolved", color: "bg-verified/10 text-verified", icon: CheckCircle },
  escalated: { label: "Escalated", color: "bg-destructive/10 text-destructive", icon: ShieldAlert },
};

const ComplaintsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      setComplaints((data as Complaint[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const isSeller = (c: Complaint) => c.seller_id === user?.id;

  const handleRespond = async (complaintId: string) => {
    if (!responseText.trim()) return;
    setSubmittingResponse(true);
    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          seller_response: responseText.trim(),
          seller_responded_at: new Date().toISOString(),
          status: "responded",
        })
        .eq("id", complaintId);
      if (error) throw error;

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? { ...c, seller_response: responseText.trim(), status: "responded", seller_responded_at: new Date().toISOString() }
            : c
        )
      );
      toast({ title: "Response submitted ✓" });
      setRespondingId(null);
      setResponseText("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmittingResponse(false);
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Complaints</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">No complaints</p>
            <p className="mt-1.5 text-sm text-muted-foreground">You haven't raised or received any complaints.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => {
              const seller = isSeller(c);
              const cfg = statusConfig[c.status] || statusConfig.open;
              const StatusIcon = cfg.icon;
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${seller ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {seller ? "Against You" : "Your Complaint"}
                      </span>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {categoryLabels[c.category] || c.category}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>

                  {c.proof_urls && c.proof_urls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {c.proof_urls.map((url, i) => (
                        <img key={i} src={url} alt="Proof" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                      ))}
                    </div>
                  )}

                  {/* Seller response */}
                  {c.seller_response && (
                    <div className="rounded-xl bg-secondary/50 px-3 py-2 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Seller Response</p>
                      <p className="text-xs text-foreground">{c.seller_response}</p>
                    </div>
                  )}

                  {/* Seller respond form */}
                  {seller && c.status === "open" && (
                    <div>
                      {respondingId === c.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Explain your side or offer a resolution..."
                            className="rounded-xl min-h-[80px] text-xs"
                            maxLength={500}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRespond(c.id)}
                              disabled={!responseText.trim() || submittingResponse}
                              size="sm"
                              className="rounded-xl text-xs"
                            >
                              {submittingResponse ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                              Submit Response
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRespondingId(null)}
                              className="rounded-xl text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRespondingId(c.id); setResponseText(""); }}
                          className="rounded-xl text-xs"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" /> Respond
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">#{c.id.slice(0, 8)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ComplaintsPage;
