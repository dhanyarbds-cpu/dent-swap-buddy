import { useState, useRef, useCallback } from "react";
import { Search, SlidersHorizontal, X, ArrowLeft, Crown, Bell } from "lucide-react";
import { listings, categories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const sortOptions = ["Newest", "Price: Low", "Price: High", "Relevant"];

const SearchPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [trackedQuery, setTrackedQuery] = useState<string | null>(null);
  const trackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = listings.filter(
    (l) =>
      !query ||
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.hashtags.some((h) => h.toLowerCase().includes(query.toLowerCase())) ||
      l.category.toLowerCase().includes(query.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Price: Low") return a.price - b.price;
    if (sortBy === "Price: High") return b.price - a.price;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const suggestions = query.length > 0
    ? ["Dental Instruments", "BDS Books", "Phantom Head", "Handpiece", "Ortho Kit", "Autoclave"]
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : [];

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search equipment, books..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="border-b border-border bg-card px-4 py-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left text-sm text-foreground hover:bg-secondary transition"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-4">
          {sortOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                sortBy === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">{sorted.length} results</p>
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((listing, i) => (
              <div key={listing.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
                <ProductCard listing={listing} onClick={() => setSelectedListing(listing)} />
              </div>
            ))}
          </div>
          {sorted.length === 0 && query.length > 2 && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🔍</div>
              <p className="mt-4 text-sm font-medium text-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try different keywords</p>

              {/* Elite auto-track prompt */}
              {profile?.is_elite && trackedQuery !== query && (
                <button
                  onClick={async () => {
                    if (!user) return;
                    await supabase.from("demand_alerts").insert({
                      user_id: user.id,
                      keywords: query,
                    });
                    setTrackedQuery(query);
                    toast({ title: "Search tracked ✓", description: "You'll be notified when matching products appear." });
                  }}
                  className="mt-4 flex items-center gap-2 rounded-full dentzap-gradient px-4 py-2 text-xs font-semibold text-primary-foreground dentzap-shadow"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Alert me when available
                </button>
              )}
              {profile?.is_elite && trackedQuery === query && (
                <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-verified">
                  <Crown className="h-3.5 w-3.5" /> Tracking active — we'll notify you
                </p>
              )}
              {!profile?.is_elite && user && (
                <p className="mt-4 text-[11px] text-muted-foreground">
                  <Crown className="mr-1 inline h-3 w-3 text-primary" />
                  Elite members get notified when this product becomes available
                </p>
              )}
            </div>
          )}
          {sorted.length === 0 && query.length <= 2 && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🔍</div>
              <p className="mt-4 text-sm font-medium text-foreground">Search for products</p>
              <p className="mt-1 text-xs text-muted-foreground">Type to find equipment, books, and more</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
