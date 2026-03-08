import { useState, useEffect } from "react";
import { Package, Plus, Eye, MessageSquare, Heart, CheckCircle, TrendingUp, XCircle, Loader2, MoreVertical, Trash2, Tag, IndianRupee, BarChart3 } from "lucide-react";
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

type AdTab = "active" | "sold" | "expired" | "earnings";

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

interface EarningsData {
  totalSales: number;
  totalCommission: number;
  netEarnings: number;
  completedCount: number;
  pendingPayout: number;
}

const MyAdsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdTab>("active");
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ views: 0, chats: 0, saves: 0 });
  const [earnings, setEarnings] = useState<EarningsData>({ totalSales: 0, totalCommission: 0, netEarnings: 0, completedCount: 0, pendingPayout: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, images, status, condition, location, category, created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setListings(data as any);

      const { count: chatCount } = await supabase
        .from("chat_requests")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id);

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

      // Fetch seller earnings from orders
      const { data: orders } = await supabase
        .from("orders")
        .select("price, commission_amount, seller_payout, status, escrow_status")
        .eq("seller_id", user.id);

      if (orders) {
        const completed = orders.filter((o: any) => o.status === "completed");
        const held = orders.filter((o: any) => o.escrow_status === "held");
        setEarnings({
          totalSales: orders.reduce((s: number, o: any) => s + Number(o.price || 0), 0),
          totalCommission: orders.reduce((s: number, o: any) => s + Number(o.commission_amount || 0), 0),
          netEarnings: completed.reduce((s: number, o: any) => s + Number(o.seller_payout || 0), 0),
          completedCount: completed.length,
          pendingPayout: held.reduce((s: number, o: any) => s + Number(o.seller_payout || 0), 0),
        });
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const filtered = listings.filter((l) => {
    if (activeTab === "active") return l.status === "active";
    if (activeTab === "sold") return l.status === "sold";
    if (activeTab === "expired") return l.status === "expired";
    return false;
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

  const tabs = [
    { key: "active" as AdTab, label: "Active", icon: CheckCircle },
    { key: "sold" as AdTab, label: "Sold", icon: TrendingUp },
    { key: "expired" as AdTab, label: "Expired", icon: XCircle },
    { key: "earnings" as AdTab, label: "Earnings", icon: BarChart3 },
  ];

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">My Ads</h1>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
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
        {/* Analytics Cards - show on listing tabs */}
        {activeTab !== "earnings" && (
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
        )}

        {/* Earnings Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Sales", value: formatPrice(earnings.totalSales), icon: IndianRupee, color: "text-primary" },
                { label: "Net Earnings", value: formatPrice(earnings.netEarnings), icon: TrendingUp, color: "text-verified" },
                { label: "Commission Paid", value: formatPrice(earnings.totalCommission), icon: BarChart3, color: "text-amber-500" },
                { label: "Pending Payout", value: formatPrice(earnings.pendingPayout), icon: Package, color: "text-muted-foreground" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
              <p className="text-sm font-bold text-foreground">Commission Structure</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                A small platform commission (1.5%–2%) is charged on successful sales above ₹100. This helps maintain the platform and ensure secure transactions for everyone.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-verified/10 px-2.5 py-1 text-[10px] font-semibold text-verified">
                  {earnings.completedCount} completed sales
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Listings */}
        {activeTab !== "earnings" && (
          <>
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
          </>
        )}
      </main>
    </div>
  );
};

export default MyAdsPage;
