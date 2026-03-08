import { useState, useRef, useCallback, useEffect } from "react";
import { Search, SlidersHorizontal, X, Crown, Bell, Mic, MicOff, MapPin, Filter, ChevronDown } from "lucide-react";
import { listings, categories } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const sortOptions = ["Newest", "Price: Low", "Price: High", "Relevant"];
const sellerTypeOptions = ["All Sellers", "Individuals", "Companies", "New Only"];
const conditionOptions = ["All", "New", "Like New", "Good", "Fair"];
const priceRanges = [
  { label: "Any Price", min: 0, max: Infinity },
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500–₹2000", min: 500, max: 2000 },
  { label: "₹2000–₹5000", min: 2000, max: 5000 },
  { label: "Above ₹5000", min: 5000, max: Infinity },
];

const CONSUMABLE_KEYWORDS = [
  "syringe", "syringes", "glove", "gloves", "mask", "masks", "medicine", "medicines",
  "pharmaceutical", "reagent", "reagents", "disposable", "cotton", "gauze", "bandage",
  "capsule", "tablet", "injection", "food", "grocery", "groceries", "beverage",
  "consumable", "edible", "drink",
];

function isConsumableQuery(q: string): boolean {
  const lower = q.toLowerCase();
  return CONSUMABLE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const SearchPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [sellerFilter, setSellerFilter] = useState("All Sellers");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [trackedQuery, setTrackedQuery] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priceRange, setPriceRange] = useState(0);
  const [conditionFilter, setConditionFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "pickup" | "shipping">("all");
  const [voiceAlternatives, setVoiceAlternatives] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryNames = ["All", ...categories.map(c => c.name)];

  // Filter results
  const filtered = listings.filter((l) => {
    if (isConsumableQuery(query)) return false;
    const matchesQuery = !query ||
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.hashtags.some((h) => h.toLowerCase().includes(query.toLowerCase())) ||
      l.category.toLowerCase().includes(query.toLowerCase()) ||
      l.seller.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = categoryFilter === "All" || l.category.toLowerCase() === categoryFilter.toLowerCase();
    const range = priceRanges[priceRange];
    const matchesPrice = l.price >= range.min && l.price <= range.max;
    const matchesCondition = conditionFilter === "All" || l.condition.toLowerCase() === conditionFilter.toLowerCase();
    const matchesLocation = !locationFilter || l.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesAvailability = availabilityFilter === "all" || true;
    return matchesQuery && matchesCategory && matchesPrice && matchesCondition && matchesLocation && matchesAvailability;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Price: Low") return a.price - b.price;
    if (sortBy === "Price: High") return b.price - a.price;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Dynamic suggestions based on query + voice interim
  const activeQuery = interimText || query;
  const suggestions = activeQuery.length > 0
    ? [...new Set([
        ...categories.map(c => c.name),
        "Dental Instruments", "BDS Books", "Phantom Head", "Handpiece",
        "Ortho Kit", "Autoclave", "Surgical Kit", "Lab Equipment",
        ...listings.map(l => l.title),
      ])].filter((s) => s.toLowerCase().includes(activeQuery.toLowerCase())).slice(0, 6)
    : [];

  // Voice search with alternatives
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice search not supported", description: "Your browser doesn't support voice search.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    const langMap: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
      kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
    };
    recognition.lang = langMap[language] || "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceAlternatives([]);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";
      const alts: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          // Collect alternatives for accent variations
          for (let j = 1; j < result.length; j++) {
            if (result[j].transcript && result[j].transcript !== result[0].transcript) {
              alts.push(result[j].transcript.trim());
            }
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setQuery(finalTranscript.trim());
        setInterimText("");
        if (alts.length > 0) setVoiceAlternatives(alts.slice(0, 3));
      } else {
        setInterimText(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast({ title: "Microphone blocked", description: "Please allow microphone access.", variant: "destructive" });
      }
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [toast, language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    isListening ? stopListening() : startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  const showConsumableWarning = query.length > 2 && isConsumableQuery(query);
  const activeFiltersCount = [
    categoryFilter !== "All",
    priceRange !== 0,
    conditionFilter !== "All",
    locationFilter !== "",
    availabilityFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${
            isListening ? "border-primary bg-primary/5" : "border-border bg-secondary/50"
          }`}>
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setVoiceAlternatives([]); }}
              placeholder={isListening ? (t("search.listening") || "Listening...") : (t("search.placeholder") || "Search equipment, books...")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && !isListening && (
              <button onClick={() => { setQuery(""); setVoiceAlternatives([]); }} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="h-5 w-px bg-border shrink-0" />
            <button
              onClick={toggleVoice}
              className={`shrink-0 rounded-full p-1 transition-all ${
                isListening ? "text-primary animate-pulse" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={isListening ? "Stop voice search" : "Start voice search"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              showFilters || activeFiltersCount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Voice listening indicator */}
        {isListening && (
          <div className="flex items-center justify-center gap-2 bg-primary/5 border-b border-primary/20 px-4 py-2.5">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="h-3 w-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.15s" }} />
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
            </div>
            <p className="text-xs font-medium text-primary">
              {interimText || "Speak now..."}
            </p>
          </div>
        )}

        {/* Voice alternatives - "Did you mean?" */}
        {voiceAlternatives.length > 0 && !isListening && (
          <div className="border-b border-border bg-secondary/30 px-4 py-2.5 animate-fade-in">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Did you mean?</p>
            <div className="flex flex-wrap gap-1.5">
              {voiceAlternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(alt); setVoiceAlternatives([]); }}
                  className="rounded-full bg-card border border-border px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition"
                >
                  {alt}
                </button>
              ))}
              <button
                onClick={() => setVoiceAlternatives([])}
                className="rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="border-b border-border bg-card px-4 py-3 space-y-3 animate-fade-in">
            {/* Category */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {categoryNames.slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Price Range</p>
              <div className="flex flex-wrap gap-1.5">
                {priceRanges.map((range, i) => (
                  <button
                    key={range.label}
                    onClick={() => setPriceRange(i)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      priceRange === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Condition</p>
              <div className="flex flex-wrap gap-1.5">
                {conditionOptions.map((cond) => (
                  <button
                    key={cond}
                    onClick={() => setConditionFilter(cond)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      conditionFilter === cond ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Location</p>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Filter by city or area..."
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Availability */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Availability</p>
              <div className="flex gap-1.5">
                {([["all", "All"], ["pickup", "Pickup"], ["shipping", "Shipping"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setAvailabilityFilter(val)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      availabilityFilter === val ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setCategoryFilter("All"); setPriceRange(0); setConditionFilter("All"); setLocationFilter(""); setAvailabilityFilter("all"); }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Consumable warning */}
        {showConsumableWarning && (
          <div className="mx-4 mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3.5 py-2.5">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Consumable products are not available on this platform. Only durable medical, dental, and laboratory equipment is listed.
            </p>
          </div>
        )}

        {/* Suggestions (show during voice & typing) */}
        {suggestions.length > 0 && !showConsumableWarning && (
          <div className="border-b border-border bg-card px-4 py-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); setVoiceAlternatives([]); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left text-sm text-foreground hover:bg-secondary transition"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span dangerouslySetInnerHTML={{
                  __html: s.replace(new RegExp(`(${activeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<strong class="text-primary">$1</strong>')
                }} />
              </button>
            ))}
          </div>
        )}

        {/* Sort & Seller filter */}
        <div className="space-y-2 px-4 pt-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {sortOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  sortBy === opt ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {sellerTypeOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSellerFilter(opt)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  sellerFilter === opt ? "bg-accent text-accent-foreground ring-1 ring-primary/20" : "bg-secondary/60 text-muted-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="p-4">
          {!showConsumableWarning && (
            <>
              <p className="mb-3 text-xs font-medium text-muted-foreground">{sorted.length} results</p>
              <div className="grid grid-cols-2 gap-3">
                {sorted.map((listing, i) => (
                  <div key={listing.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
                    <ProductCard listing={listing} onClick={() => setSelectedListing(listing)} />
                  </div>
                ))}
              </div>
            </>
          )}
          {(sorted.length === 0 && query.length > 2 && !showConsumableWarning) && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🔍</div>
              <p className="mt-4 text-sm font-medium text-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try different keywords or adjust filters</p>

              {profile?.is_elite && trackedQuery !== query && (
                <button
                  onClick={async () => {
                    if (!user) return;
                    await supabase.from("demand_alerts").insert({ user_id: user.id, keywords: query });
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
          {sorted.length === 0 && query.length <= 2 && !showConsumableWarning && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🔍</div>
              <p className="mt-4 text-sm font-medium text-foreground">{t("search.placeholder") ? "Search for products" : "Search for products"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Type or use voice search to find equipment</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
