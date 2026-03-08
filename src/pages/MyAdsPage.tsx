import { useState, useEffect } from "react";
import { Package, Plus, Eye, MessageSquare, Heart, CheckCircle, TrendingUp, XCircle, Loader2, MoreVertical, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, timeAgo } from "@/lib/mockData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdTab = "active" | "sold" | "expired";

interface MyListing {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  status: string;
  condition: string;
  location: string;
  category: string;
  created_at: string;
}

const MyAdsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdTab>("active");
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ views: 0, chats: 0, saves: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, images, status, condition, location, category, created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setListings(data as any);

      // Fetch chat count
      const { count: chatCount } = await supabase
        .from("chat_requests")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id);

      // Fetch wishlist/save count for user's listings
      const listingIds = (data || []).map((l: any) => l.id);
      let saveCount = 0;
      if (listingIds.length > 0) {
        const { count } = await supabase
          .from("wishlists")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds);
        saveCount = count || 0;
      }

      setStats({ views: 0, chats: chatCount || 0, saves: saveCount });
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = listings.filter((l) => {
    if (activeTab === "active") return l.status === "active";
    if (activeTab === "sold") return l.status === "sold";
    return l.status === "expired";
  });

  const handleMarkSold = async (id: string) => {
    const { error } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", id);
    if (!error) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: "sold" } : l));
      toast({ title: "Marked as sold ✓" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);
    if (!error) {
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Listing deleted" });
    }
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">My Ads</h1>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {([
            { key: "active", label: "Active", icon: CheckCircle },
            { key: "sold", label: "Sold", icon: TrendingUp },
            { key: "expired", label: "Expired", icon: XCircle },
          ] as { key: AdTab; label: string; icon: typeof CheckCircle }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {/* Analytics Cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { icon: Eye, label: "Views", value: String(stats.views), color: "text-primary" },
            { icon: MessageSquare, label: "Chats", value: String(stats.chats), color: "text-verified" },
            { icon: Heart, label: "Saves", value: String(stats.saves), color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center animate-fade-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">
              {activeTab === "active" ? "No active listings" : activeTab === "sold" ? "No sold items yet" : "No expired listings"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px]">
              {activeTab === "active" ? "Start selling your products to thousands of buyers." : "Items will appear here once sold."}
            </p>
            {activeTab === "active" && (
              <Button
                onClick={() => navigate("/sell")}
                className="mt-6 gap-2 dentzap-gradient rounded-xl px-6 py-5 text-sm font-semibold text-primary-foreground dentzap-shadow"
              >
                <Plus className="h-5 w-5" />
                Post Your First Ad
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => {
              const img = listing.images?.[0];
              return (
                <div
                  key={listing.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3 dentzap-card-shadow"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {img ? (
                      <img src={img} alt={listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🦷</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{listing.title}</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(listing.price)}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">{listing.condition}</span>
                        <span>{listing.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(listing.created_at)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {listing.status === "active" && (
                            <DropdownMenuItem onClick={() => handleMarkSold(listing.id)}>
                              <Tag className="mr-2 h-4 w-4" /> Mark as Sold
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(listing.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

export default MyAdsPage;
