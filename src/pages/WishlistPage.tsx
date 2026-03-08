import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Loader2, MapPin, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { formatPrice, timeAgo } from "@/lib/mockData";

interface WishlistItem {
  id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    price: number;
    location: string;
    images: string[] | null;
    condition: string;
    status: string;
    created_at: string;
  };
}

const WishlistPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggle } = useWishlist();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id, listing_id, created_at, listing:listings(id, title, price, location, images, condition, status, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setItems(data as any);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleRemove = async (listingId: string) => {
    await toggle(listingId);
    setItems((prev) => prev.filter((i) => i.listing_id !== listingId));
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Wishlist</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
            {items.length} saved
          </span>
        )}
      </header>

      <main className="mx-auto max-w-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">Your wishlist is empty</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px]">
              Tap the heart icon on products to save them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const listing = item.listing;
              const img = listing.images?.[0];
              return (
                <div
                  key={item.id}
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
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {listing.location.split(",")[0]}
                        <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium">
                          {listing.condition}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(item.created_at)}
                      </span>
                      <button
                        onClick={() => handleRemove(item.listing_id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
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

export default WishlistPage;
