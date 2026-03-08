import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const MyAdsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="safe-bottom min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
        <h1 className="mx-auto max-w-lg text-lg font-bold text-foreground">My Ads</h1>
      </header>

      <main className="mx-auto max-w-lg">
        <div className="flex flex-col items-center py-24 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 font-semibold text-foreground">No ads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start selling your products and equipment.</p>
          <Button
            onClick={() => navigate("/sell")}
            className="mt-6 gap-2 dentzap-gradient rounded-xl text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Post Your First Ad
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MyAdsPage;
