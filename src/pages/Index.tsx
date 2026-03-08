import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronDown, Search, Mic, Heart, Bell } from "lucide-react";
import { listings, categories as fallbackCategories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

const bannerSlides = [
  { title: "Up to 40% Off Dental Kits", subtitle: "Trusted by 10,000+ students across India", tag: "Sale" },
  { title: "Sell Your Old Instruments", subtitle: "List for free and reach thousands of buyers", tag: "New" },
  { title: "Verified Sellers Only", subtitle: "Shop with confidence from verified professionals", tag: "Featured" },
];

interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>(fallbackCategories);
  const categoryRef = useRef<HTMLDivElement>(null);

  const filtered = activeCategory
    ? listings.filter((l) => l.category === activeCategory)
    : listings;

  // Fetch categories from DB
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % bannerSlides.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCategoryClick = (catName: string) => {
    if (activeCategory === catName) {
      setActiveCategory(null);
    } else {
      setActiveCategory(catName);
    }
  };

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
              <button onClick={() => navigate("/wishlist")} className="rounded-full p-2.5 text-primary-foreground/80 transition hover:bg-primary-foreground/10">
                <Heart className="h-5 w-5" />
              </button>
              <button className="relative rounded-full p-2.5 text-primary-foreground/80 transition hover:bg-primary-foreground/10">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-primary" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <button
              onClick={() => navigate("/search")}
              className="flex w-full items-center gap-3 rounded-xl bg-primary-foreground px-4 py-3 transition-shadow hover:shadow-md"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left text-sm text-muted-foreground">Search equipment, books, devices...</span>
              <div className="h-5 w-px bg-border" />
              <Mic className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Categories - Grid */}
        <div className="px-4 pt-5 pb-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
            <button
              onClick={() => navigate("/search")}
              className="text-xs font-semibold text-primary"
            >
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
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-transparent bg-card dentzap-card-shadow hover:dentzap-card-shadow-hover"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
                  activeCategory === cat.name ? "bg-primary/10" : "bg-secondary"
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

        {/* Banner Carousel */}
        <div className="px-4 pt-4 pb-1">
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
