import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/mockData";

interface DbListing {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  brand: string;
  description: string;
  location: string;
  images: string[] | null;
  hashtags: string[] | null;
  is_negotiable: boolean;
  seller_id: string;
  status: string;
  created_at: string;
  pickup_available: boolean;
  shipping_available: boolean;
  external_link: string | null;
  seller_type: string;
  company_profile_id: string | null;
}

function mapDbToListing(db: DbListing, profile?: any): Listing & { seller_type?: string; pickupAvailable?: boolean; shippingAvailable?: boolean; seller_id?: string } {
  return {
    id: db.id,
    title: db.title,
    price: db.price,
    category: db.category,
    condition: db.condition as "New" | "Used",
    brand: db.brand || "",
    description: db.description || "",
    location: db.location || "",
    external_link: db.external_link || undefined,
    images: db.images || [],
    hashtags: db.hashtags || [],
    createdAt: db.created_at,
    seller_type: db.seller_type,
    seller_id: db.seller_id, // ← preserve for NegotiateDialog FK
    pickupAvailable: db.pickup_available,
    shippingAvailable: db.shipping_available,
    seller: {
      name: profile?.full_name || "Seller",
      college: profile?.college || "",
      year: profile?.year_of_study || "",
      verified: profile?.verified || false,
      avatar: profile?.avatar_url || "",
    },
  };
}

export function useListings(options?: { category?: string; realtime?: boolean }) {
  const [listings, setListings] = useState<(Listing & { seller_type?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);

      if (options?.category) {
        query = query.eq("category", options.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      // Fetch seller profiles in batch
      const sellerIds = [...new Set(data.map((d: any) => d.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, college, year_of_study, verified, avatar_url")
        .in("user_id", sellerIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const mapped = data.map((d: any) => mapDbToListing(d, profileMap.get(d.seller_id)));
      setListings(mapped);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  }, [options?.category]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Realtime subscription for new/updated listings
  useEffect(() => {
    if (!options?.realtime) return;

    const channel = supabase
      .channel("listings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => {
          // Refetch on any change
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options?.realtime, fetchListings]);

  return { listings, loading, refetch: fetchListings };
}
