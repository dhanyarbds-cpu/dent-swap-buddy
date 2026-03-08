import { useState, useEffect } from "react";
import { MapPin, ChevronDown, Search, Mic, Heart, Bell, Loader2 } from "lucide-react";
import { listings, categories as fallbackCategories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import LocationSelector from "@/components/LocationSelector";
import type { Listing } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserLocation } from "@/hooks/useUserLocation";
import PromoBannerCarousel from "@/components/PromoBannerCarousel";

const Index = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>(fallbackCategories);
  const [locationOpen, setLocationOpen] = useState(false);

  const { location, detectLocation, setManualLocation, searchCities } = useUserLocation();

  // Sort listings by proximity to selected location (simple city-name matching)
  const sortByLocation = (items: Listing[]) => {
    if (!location.city) return items;
    const city = location.city.toLowerCase();
    return [...items].sort((a, b) => {
      const aMatch = a.location.toLowerCase().includes(city) ? 0 : 1;
      const bMatch = b.location.toLowerCase().includes(city) ? 0 : 1;
      return aMatch - bMatch;
    });
  };

  const filtered = sortByLocation(
    activeCategory ? listings.filter((l) => l.category === activeCategory) : listings
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, icon, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (data && data.length > 0) {
        setCategories(data.map((c: any) => ({ name: c.name, icon: c.icon })));
      }
    };
    fetchCategories();
  }, []);


  const handleCategoryClick = (catName: string) => {
    setActiveCategory(activeCategory === catName ? null : catName);
  };

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  return (
    <div className="safe-bottom min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-border">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              onClick={() => setLocationOpen(true)}
              className="flex items-center gap-1.5 press-scale"
            >
              <div className={`relative ${location.isDetected || location.displayName ? "text-primary" : "text-muted-foreground"}`}>
                {location.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <MapPin className={`h-4 w-4 transition-colors ${location.isDetected ? "drop-shadow-[0_0_4px_hsl(255,65%,58%)]" : ""}`} />
                )}
                {(location.isDetected || location.displayName) && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-1 ring-card" />
                )}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Location</p>
                <div className="flex items-center gap-0.5">
                  <span className="text-sm font-semibold text-foreground max-w-[160px] truncate">
                    {location.loading
                      ? "Detecting..."
                      : location.displayName || "Select Location"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={() => navigate("/wishlist")} className="rounded-full p-2.5 text-muted-foreground transition hover:text-primary hover:bg-primary/10">
                <Heart className="h-5 w-5" />
              </button>
              <button className="relative rounded-full p-2.5 text-muted-foreground transition hover:text-primary hover:bg-primary/10">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <button
              onClick={() => navigate("/search")}
              className="flex w-full items-center gap-3 rounded-xl glass-search px-4 py-3 transition-all hover:glow-border"
            >
              <Search className="h-4 w-4 text-primary/60" />
              <span className="flex-1 text-left text-sm text-muted-foreground">Search equipment, books, devices...</span>
              <div className="h-5 w-px bg-border" />
              <Mic className="h-4 w-4 text-primary/60" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Categories */}
        <div className="px-4 pt-5 pb-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
            <button onClick={() => navigate("/search")} className="text-xs font-semibold text-primary">
              See All
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {categories.slice(0, 10).map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all duration-200 press-scale ${
                  activeCategory === cat.name
                    ? "border-primary/30 bg-primary/8 glow-border"
                    : "glass-card hover:border-primary/15 hover:glow-border"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
                  activeCategory === cat.name ? "bg-primary/15" : "bg-secondary/60"
                }`}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-2">
                  {cat.name.length > 12 ? cat.name.split(" ").slice(0, 2).join(" ") : cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Promotional Banners */}
        <PromoBannerCarousel />

        {/* Product Feed */}
        <div className="px-4 pt-5 pb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {activeCategory || (location.city ? `Near ${location.city}` : "Fresh Recommendations")}
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              {filtered.length} items
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((listing, i) => (
              <div key={listing.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <ProductCard listing={listing} onClick={() => setSelectedListing(listing)} />
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🔍</div>
              <p className="mt-4 text-sm font-medium text-foreground">No listings found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try browsing a different category</p>
            </div>
          )}
        </div>
      </main>

      {/* Location Selector Panel */}
      <LocationSelector
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        displayName={location.displayName}
        loading={location.loading}
        error={location.error}
        permissionDenied={location.permissionDenied}
        isDetected={location.isDetected}
        onDetect={detectLocation}
        onSelect={setManualLocation}
        searchCities={searchCities}
      />
    </div>
  );
};

export default Index;
