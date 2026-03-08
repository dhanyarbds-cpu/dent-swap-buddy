import { useState } from "react";
import { MapPin, ChevronDown, Search, Mic, Heart, Bell } from "lucide-react";
import { listings, categories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/mockData";
import logo from "@/assets/logo.png";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const filtered = activeCategory
    ? listings.filter((l) => l.category === activeCategory)
    : listings;

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      {/* Top Bar - Location + Icons */}
      <header className="sticky top-0 z-40 bg-primary">
        <div className="mx-auto max-w-lg">
          {/* Location Row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button className="flex items-center gap-1 text-primary-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-semibold">Mumbai, Maharashtra</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1">
              <button className="rounded-full p-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground hover:bg-primary-foreground/10">
                <Heart className="h-5 w-5" />
              </button>
              <button className="relative rounded-full p-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground hover:bg-primary-foreground/10">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-primary" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-lg bg-primary-foreground px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">Search products, equipment, books...</span>
              <div className="h-5 w-px bg-border" />
              <Mic className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Category Grid */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-4 gap-3">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-200 active:scale-95 ${
                  activeCategory === cat.name
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "bg-card dentzap-card-shadow hover:bg-muted/50"
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[10px] font-medium leading-tight text-center text-foreground line-clamp-2">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
          {/* See All Categories */}
          <div className="mt-2 flex justify-center">
            <button className="text-xs font-semibold text-primary hover:underline">
              See All Categories →
            </button>
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="px-4 pt-2 pb-1">
          <div className="relative overflow-hidden rounded-xl">
            <img src={heroBanner} alt="Promotional Banner" className="h-36 w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent p-4">
              <span className="mb-1 w-fit rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Sponsored
              </span>
              <p className="text-base font-bold text-primary-foreground">Up to 40% Off on Dental Kits</p>
              <p className="text-xs text-primary-foreground/70">Trusted by 10,000+ dental students across India</p>
            </div>
          </div>
        </div>

        {/* Product Feed */}
        <div className="px-4 pt-4 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              {activeCategory || "Fresh Recommendations"}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} items</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((listing) => (
              <ProductCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="text-4xl">🔍</span>
              <p className="mt-2 text-sm text-muted-foreground">No listings in this category yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
