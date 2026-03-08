import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { listings, categories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/mockData";

const sortOptions = ["Newest", "Price: Low", "Price: High", "Relevant"];

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

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
    ? ["Dental Instruments", "BDS Books", "Phantom Head", "Handpiece", "Ortho Kit"]
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : [];

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  return (
    <div className="safe-bottom min-h-screen bg-background">
      {/* Search Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dental materials..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground">
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
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-muted"
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
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                sortBy === opt
                  ? "dentzap-gradient text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="p-4">
          <p className="mb-3 text-xs text-muted-foreground">{sorted.length} results</p>
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((listing) => (
              <ProductCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
