import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, MessageSquare, Tag } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

interface ListingDetailProps {
  listing: Listing;
  onBack: () => void;
}

const ListingDetail = ({ listing, onBack }: ListingDetailProps) => {
  const initials = listing.seller.name.split(" ").map((n) => n[0]).join("");

  return (
    <div className="safe-bottom min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={onBack} className="rounded-full p-1.5 text-foreground transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Share2 className="h-5 w-5" />
          </button>
          <button className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Image */}
      <div className="aspect-square bg-muted">
        <div className="flex h-full items-center justify-center text-6xl text-muted-foreground/20">🦷</div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        {/* Price & Title */}
        <div>
          <p className="text-2xl font-extrabold text-primary">{formatPrice(listing.price)}</p>
          <h1 className="mt-1 text-lg font-bold text-foreground">{listing.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location}</span>
            <span>{timeAgo(listing.createdAt)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{listing.condition}</span>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Details</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Category</span><p className="font-medium">{listing.category}</p></div>
            <div><span className="text-muted-foreground">Brand</span><p className="font-medium">{listing.brand}</p></div>
            <div><span className="text-muted-foreground">Condition</span><p className="font-medium">{listing.condition}</p></div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Description</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {listing.hashtags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Tag className="h-3 w-3" />{tag}
            </span>
          ))}
        </div>

        {/* Seller */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{listing.seller.name}</span>
              {listing.seller.verified && <BadgeCheck className="h-4 w-4 text-verified" />}
            </div>
            <p className="text-xs text-muted-foreground">{listing.seller.college} · {listing.seller.year}</p>
          </div>
        </div>

        {/* Action */}
        <Button className="dentzap-gradient dentzap-shadow w-full gap-2 rounded-xl py-6 text-base font-bold text-primary-foreground">
          <MessageSquare className="h-5 w-5" />
          Send Buy Request
        </Button>
      </div>
    </div>
  );
};

export default ListingDetail;
