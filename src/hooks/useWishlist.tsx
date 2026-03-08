import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface WishlistContextType {
  wishlistedIds: Set<string>;
  toggle: (listingId: string) => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistedIds: new Set(),
  toggle: async () => {},
  loading: false,
});

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setWishlistedIds(new Set()); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("listing_id")
        .eq("user_id", user.id);
      if (data) setWishlistedIds(new Set(data.map((w: any) => w.listing_id)));
    };
    fetch();
  }, [user]);

  const toggle = useCallback(async (listingId: string) => {
    if (!user) return;
    const isWishlisted = wishlistedIds.has(listingId);

    // Optimistic update
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (isWishlisted) next.delete(listingId);
      else next.add(listingId);
      return next;
    });

    if (isWishlisted) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
      if (error) {
        setWishlistedIds((prev) => { const n = new Set(prev); n.add(listingId); return n; });
        toast({ title: "Failed to remove", variant: "destructive" });
      }
    } else {
      const { error } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id, listing_id: listingId } as any);
      if (error) {
        setWishlistedIds((prev) => { const n = new Set(prev); n.delete(listingId); return n; });
        toast({ title: "Failed to save", variant: "destructive" });
      } else {
        toast({ title: "Added to wishlist ❤️" });
      }
    }
  }, [user, wishlistedIds, toast]);

  return (
    <WishlistContext.Provider value={{ wishlistedIds, toggle, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};
