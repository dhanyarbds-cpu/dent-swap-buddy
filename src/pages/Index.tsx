import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronDown, Search, Mic, Heart, Bell } from "lucide-react";
import { listings, categories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/mockData";
import heroBanner from "@/assets/hero-banner.jpg";

const bannerSlides = [
  { title: "Up to 40% Off Dental Kits", subtitle: "Trusted by 10,000+ students across India", tag: "Sale" },
  { title: "Sell Your Old Instruments", subtitle: "List for free and reach thousands of buyers", tag: "New" },
  { title: "Verified Sellers Only", subtitle: "Shop with confidence from verified professionals", tag: "Featured" },
];

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const categoryRef = useRef<HTMLDivElement>(null);

  const filtered = activeCategory
    ? listings.filter((l) => l.category === activeCategory)
    : listings;

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % bannerSlides.length), 4000);
    return () => clearInterval(timer);
  }, []);

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button className="flex items-center gap-1.5 text-primary-foreground">
              <MapPin className="h-4 w-4 opacity-80" />
              <div className="text-left">
                <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Location</p>
                <div className="flex items-center gap-0.5">
                  <span className="text-sm font-semibold">Mumbai, Maharashtra</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </div>
              </div>
            </button>
            <div className="flex items-center gap-0.5">
              <button className="rounded-full p-2.5 text-primary-foreground/80 transition hover:bg-primary-foreground/10">
                <Heart className="h-5 w-5" />
              </button>
              <button className="relative rounded-full p-2.5 text-primary-foreground/80 transition hover:bg-primary-foreground/10">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-primary" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <button className="flex w-full items-center gap-3 rounded-xl bg-primary-foreground px-4 py-3 transition-shadow hover:shadow-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left text-sm text-muted-foreground">Search equipment, books, devices...</span>
              <div className="h-5 w-px bg-border" />
              <Mic className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Categories - Scrollable */}
        <div className="px-4 pt-5 pb-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
            <button className="text-xs font-semibold text-primary">See All</button>
          </div>
          <div ref={categoryRef} className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`flex shrink-0 flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition-all duration-200 press-scale ${
                  activeCategory === cat.name
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-transparent bg-card dentzap-card-shadow hover:dentzap-card-shadow-hover"
                }`}
                style={{ minWidth: 80 }}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-colors ${
                  activeCategory === cat.name ? "bg-primary/10" : "bg-secondary"
                }`}>
                  {cat.icon}
                </div>
                <span className="text-[11px] font-medium text-foreground whitespace-nowrap">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Banner Carousel */}
        <div className="px-4 pt-2 pb-1">
          <div className="relative overflow-hidden rounded-2xl">
            <img src={heroBanner} alt="Promotional Banner" className="h-40 w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent p-5">
              <span className="mb-1.5 w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                {bannerSlides[currentSlide].tag}
              </span>
              <p className="text-lg font-bold text-primary-foreground leading-tight">
                {bannerSlides[currentSlide].title}
              </p>
              <p className="mt-0.5 text-xs text-primary-foreground/70">
                {bannerSlides[currentSlide].subtitle}
              </p>
            </div>
            {/* Dots */}
            <div className="absolute bottom-2 right-4 flex gap-1.5">
              {bannerSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentSlide ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Product Feed */}
        <div className="px-4 pt-5 pb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {activeCategory || "Fresh Recommendations"}
            </h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
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
    </div>
  );
};

export default Index;
