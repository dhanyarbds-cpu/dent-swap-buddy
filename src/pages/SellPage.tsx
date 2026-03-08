import { useState } from "react";
import { Camera, X, ChevronDown } from "lucide-react";
import { categories } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const conditions = ["New", "Used"];

const SellPage = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "",
    category: "",
    condition: "",
    brand: "",
    price: "",
    description: "",
    location: "",
    hashtags: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Listing submitted!", description: "Your listing is pending review." });
  };

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
        <h1 className="mx-auto max-w-lg text-lg font-bold text-foreground">Create Listing</h1>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5 p-4">
        {/* Image Upload */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Photos (up to 6)</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary transition-colors hover:border-primary/50"
            >
              <Camera className="h-6 w-6" />
              <span className="text-[10px] font-medium">Add Photo</span>
            </button>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-square rounded-xl border border-border bg-muted/50" />
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Title</label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Complete BDS Instrument Kit"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Condition</label>
              <div className="flex gap-2">
                {conditions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update("condition", c)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      form.condition === c
                        ? "dentzap-gradient border-transparent text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Price (₹)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Brand / Manufacturer</label>
            <Input
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              placeholder="e.g. GDC, NSK, Hu-Friedy"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe condition, usage history, what's included..."
              rows={4}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Location</label>
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Mumbai, Maharashtra"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Hashtags</label>
            <Input
              value={form.hashtags}
              onChange={(e) => update("hashtags", e.target.value)}
              placeholder="#DentalInstruments #BDSKit"
              className="rounded-xl"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="dentzap-gradient dentzap-shadow w-full rounded-xl py-6 text-base font-bold text-primary-foreground"
        >
          Submit for Review
        </Button>
      </form>
    </div>
  );
};

export default SellPage;
