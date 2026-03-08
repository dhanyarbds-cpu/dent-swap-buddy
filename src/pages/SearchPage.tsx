import { useState, useRef, useCallback, useEffect } from "react";
import { Search, SlidersHorizontal, X, ArrowLeft, Crown, Bell, Mic, MicOff, Languages } from "lucide-react";
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

// Consumable keywords to filter out from search
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

// Speech Recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const SearchPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [sellerFilter, setSellerFilter] = useState("All Sellers");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [trackedQuery, setTrackedQuery] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out consumable results
  const filtered = listings.filter((l) => {
    if (isConsumableQuery(query)) return false;
    return (
      !query ||
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.hashtags.some((h) => h.toLowerCase().includes(query.toLowerCase())) ||
      l.category.toLowerCase().includes(query.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Price: Low") return a.price - b.price;
    if (sortBy === "Price: High") return b.price - a.price;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const suggestions = query.length > 0
    ? ["Dental Instruments", "BDS Books", "Phantom Head", "Handpiece", "Ortho Kit", "Autoclave", "Surgical Kit", "Lab Equipment"]
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Voice search
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice search not supported", description: "Your browser doesn't support voice search.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    // Map language code to BCP-47 for Indian accents
    const langMap: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
      kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
    };
    recognition.lang = langMap[language] || "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) {
        setQuery(finalTranscript);
        setInterimText("");
      } else {
        setInterimText(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast({ title: "Microphone blocked", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} onBack={() => setSelectedListing(null)} />;
  }

  const showConsumableWarning = query.length > 2 && isConsumableQuery(query);

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
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isListening ? "Listening..." : "Search equipment, books..."}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && !isListening && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="h-5 w-px bg-border shrink-0" />
            <button
              onClick={toggleVoice}
              className={`shrink-0 rounded-full p-1 transition-all ${
                isListening
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={isListening ? "Stop voice search" : "Start voice search"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center justify-center gap-2 bg-primary/5 border-b border-primary/20 px-4 py-2.5">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="h-3 w-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.15s" }} />
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
            </div>
            <p className="text-xs font-medium text-primary">Speak now...</p>
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

        {/* Suggestions */}
        {suggestions.length > 0 && !showConsumableWarning && (
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

        {/* Sort & Filter */}
        <div className="space-y-2 px-4 pt-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
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
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {sellerTypeOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSellerFilter(opt)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  sellerFilter === opt
                    ? "bg-accent text-accent-foreground ring-1 ring-primary/20"
                    : "bg-secondary/60 text-muted-foreground"
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
              <p className="mt-1 text-xs text-muted-foreground">Try different keywords</p>

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
          {sorted.length === 0 && query.length <= 2 && !showConsumableWarning && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">🔍</div>
              <p className="mt-4 text-sm font-medium text-foreground">Search for products</p>
              <p className="mt-1 text-xs text-muted-foreground">Type or use voice search to find equipment</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
