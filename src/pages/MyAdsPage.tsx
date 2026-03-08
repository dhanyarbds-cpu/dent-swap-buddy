import { useState } from "react";
import { Package, Plus, Eye, MessageSquare, Heart, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type AdTab = "active" | "sold" | "expired";

const MyAdsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdTab>("active");

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">My Ads</h1>
        </div>
        {/* Tabs */}
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {([
            { key: "active", label: "Active", icon: CheckCircle },
            { key: "sold", label: "Sold", icon: TrendingUp },
            { key: "expired", label: "Expired", icon: XCircle },
          ] as { key: AdTab; label: string; icon: typeof CheckCircle }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {/* Analytics Cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { icon: Eye, label: "Views", value: "0", color: "text-primary" },
            { icon: MessageSquare, label: "Chats", value: "0", color: "text-verified" },
            { icon: Heart, label: "Saves", value: "0", color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 dentzap-card-shadow">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center py-16 text-center animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="mt-5 text-base font-semibold text-foreground">You haven't posted anything yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px]">
            Start selling your products, equipment, or books to thousands of buyers.
          </p>
          <Button
            onClick={() => navigate("/sell")}
            className="mt-6 gap-2 dentzap-gradient rounded-xl px-6 py-5 text-sm font-semibold text-primary-foreground dentzap-shadow"
          >
            <Plus className="h-5 w-5" />
            Post Your First Ad
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MyAdsPage;
