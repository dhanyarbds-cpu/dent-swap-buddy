import { useState } from "react";
import { MapPin, Navigation, Search, X, Loader2, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationSelectorProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  isDetected: boolean;
  onDetect: () => void;
  onSelect: (location: string) => void;
  searchCities: (query: string) => string[];
}

const LocationSelector = ({
  open,
  onClose,
  displayName,
  loading,
  error,
  permissionDenied,
  isDetected,
  onDetect,
  onSelect,
  searchCities,
}: LocationSelectorProps) => {
  const [query, setQuery] = useState("");
  const results = searchCities(query);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg animate-slide-up">
        <div className="rounded-t-3xl glass-panel border border-border border-b-0 p-5 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-foreground">Select Location</h3>
            <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Detect Location Button */}
          <button
            onClick={onDetect}
            disabled={loading}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 p-3.5 transition-all hover:bg-primary/12 hover:glow-border press-scale mb-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              {loading ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Navigation className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">
                {loading ? "Detecting location..." : "Use Current Location"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {loading ? "Please wait..." : "Auto-detect via GPS"}
              </p>
            </div>
            {isDetected && displayName && !loading && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </button>

          {/* Current Location Display */}
          {displayName && (
            <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2.5 mb-3">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground">Current location</p>
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              </div>
            </div>
          )}

          {/* Error / Permission denied */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 mb-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive/90">{error}</p>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or area..."
              className="rounded-xl py-5 pl-10 glass-search"
            />
          </div>

          {/* City List */}
          <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
            {results.map((city) => (
              <button
                key={city}
                onClick={() => {
                  onSelect(city);
                  onClose();
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all press-scale ${
                  displayName === city
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-secondary/60"
                }`}
              >
                <MapPin className={`h-4 w-4 shrink-0 ${displayName === city ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm ${displayName === city ? "font-semibold text-primary" : "text-foreground"}`}>
                  {city}
                </span>
                {displayName === city && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
              </button>
            ))}
            {results.length === 0 && query && (
              <p className="text-center text-xs text-muted-foreground py-4">No cities found for "{query}"</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LocationSelector;
