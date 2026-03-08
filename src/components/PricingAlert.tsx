import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, Sparkles, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PricingRecommendation {
  suggested_price: number;
  confidence: string;
  reasoning: string;
  action: string;
}

interface MarketData {
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface Props {
  listingId: string;
  currentPrice: number;
  onPriceUpdate?: (newPrice: number) => void;
}

const PricingAlert = ({ listingId, currentPrice, onPriceUpdate }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<PricingRecommendation | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [engagement, setEngagement] = useState<{ views: number; chats: number } | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-pricing", {
        body: { listing_id: listingId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setRecommendation(data.recommendation);
      setMarket(data.market);
      setEngagement(data.engagement);
    } catch (err: any) {
      toast({ title: "Failed to get pricing", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const applyPrice = async () => {
    if (!recommendation) return;
    setApplying(true);
    const { error } = await supabase
      .from("listings")
      .update({ price: recommendation.suggested_price })
      .eq("id", listingId);
    if (error) {
      toast({ title: "Failed to update price", variant: "destructive" });
    } else {
      toast({ title: "Price Updated ✓", description: `New price: ₹${recommendation.suggested_price}` });
      onPriceUpdate?.(recommendation.suggested_price);
    }
    setApplying(false);
  };

  const actionIcons = {
    increase: <TrendingUp className="h-4 w-4 text-verified" />,
    decrease: <TrendingDown className="h-4 w-4 text-destructive" />,
    keep: <Minus className="h-4 w-4 text-muted-foreground" />,
  };

  const confidenceColors = {
    high: "text-verified bg-verified/10",
    medium: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
    low: "text-muted-foreground bg-secondary",
  };

  if (!recommendation) {
    return (
      <Button
        onClick={fetchRecommendation}
        disabled={loading}
        variant="outline"
        className="w-full rounded-xl border-primary/20 text-xs gap-2"
        size="sm"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
        {loading ? "Analyzing..." : "AI Price Suggestion"}
      </Button>
    );
  }

  const diff = recommendation.suggested_price - currentPrice;
  const pct = Math.round((diff / currentPrice) * 100);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-foreground">AI Price Recommendation</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${confidenceColors[recommendation.confidence as keyof typeof confidenceColors] || confidenceColors.medium}`}>
          {recommendation.confidence}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {actionIcons[recommendation.action as keyof typeof actionIcons] || actionIcons.keep}
        <div>
          <p className="text-lg font-bold text-foreground">₹{recommendation.suggested_price.toLocaleString("en-IN")}</p>
          {diff !== 0 && (
            <p className={`text-[10px] font-semibold ${diff > 0 ? "text-verified" : "text-destructive"}`}>
              {diff > 0 ? "+" : ""}₹{diff.toLocaleString("en-IN")} ({pct > 0 ? "+" : ""}{pct}%)
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{recommendation.reasoning}</p>

      {market && (
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>Market avg: ₹{market.avg.toLocaleString("en-IN")}</span>
          <span>Range: ₹{market.min.toLocaleString("en-IN")}–₹{market.max.toLocaleString("en-IN")}</span>
        </div>
      )}

      {engagement && (
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>👁 {engagement.views} views</span>
          <span>💬 {engagement.chats} inquiries</span>
        </div>
      )}

      {recommendation.action !== "keep" && (
        <div className="flex gap-2 pt-1">
          <Button
            onClick={applyPrice}
            disabled={applying}
            size="sm"
            className="flex-1 rounded-xl text-xs gap-1 h-8"
          >
            {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Apply ₹{recommendation.suggested_price.toLocaleString("en-IN")}
          </Button>
          <Button
            onClick={() => setRecommendation(null)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1 h-8"
          >
            <X className="h-3 w-3" /> Dismiss
          </Button>
        </div>
      )}
    </div>
  );
};

export default PricingAlert;
