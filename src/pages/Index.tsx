import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { listings, categories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import CategoryPill from "@/components/CategoryPill";
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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="DentZap" className="h-8 w-8" />
            <h1 className="text-xl font-extrabold dentzap-gradient-text">DentZap</h1>
          </div>
          <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Hero Banner */}
        <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl">
          <img src={heroBanner} alt="Dental Marketplace" className="h-40 w-full object-cover" />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/70 to-transparent p-4">
            <p className="text-lg font-bold text-primary-foreground">Buy & Sell Dental Essentials</p>
            <p className="text-xs text-primary-foreground/80">Trusted by 10,000+ dental students across India</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 dentzap-card-shadow">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search instruments, books, kits...</span>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pt-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Categories</h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <CategoryPill
              name="All"
              icon="✨"
              count={listings.length}
              isActive={!activeCategory}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat.name}
                {...cat}
                isActive={activeCategory === cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              />
            ))}
          </div>
        </div>

        {/* Listings Grid */}
        <div className="px-4 pb-4 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {activeCategory || "Recent Listings"}
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
