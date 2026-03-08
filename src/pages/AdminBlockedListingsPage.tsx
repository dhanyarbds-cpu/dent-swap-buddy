import { useState, useEffect } from "react";
import { ArrowLeft, ShieldAlert, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface BlockedListing {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  price: number;
  reason: string;
  listing_data: any;
  created_at: string;
}

const AdminBlockedListingsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<BlockedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("blocked_listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setItems((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-foreground">Blocked Listings</h1>
          <Badge variant="outline" className="text-destructive border-destructive/30">
            {items.length}
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-lg p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No blocked listings yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  ₹{item.price}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                <p className="text-xs text-destructive font-medium">{item.reason}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminBlockedListingsPage;
