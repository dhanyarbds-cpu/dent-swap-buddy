import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, Tag, IndianRupee, Eye, Clock, Bookmark } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";
import NegotiateDialog from "@/components/NegotiateDialog";
import { Button } from "@/components/ui/button";

interface ListingDetailProps {
  listing: Listing;
  onBack: () => void;
}

const ListingDetail = ({ listing, onBack }: ListingDetailProps) => {
  const initials = listing.seller.name.split(" ").map((n) => n[0]).join("");
  const isDbListing = listing.id.length > 10;

  return (
    <div className="safe-bottom min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-card/95 px-4 py-3 backdrop-blur-xl">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted">
            <Bookmark className="h-4 w-4 text-foreground" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted">
            <Share2 className="h-4 w-4 text-foreground" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted hover:text-destructive">
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="aspect-square bg-secondary">
        <div className="flex h-full items-center justify-center text-7xl text-muted-foreground/10">🦷</div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4 animate-slide-up">
        {/* Price & Title */}
        <div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-extrabold text-foreground">{formatPrice(listing.price)}</p>
            <span className="flex items-center gap-1 rounded-full bg-verified/10 px-2.5 py-1 text-[11px] font-semibold text-verified">
              <IndianRupee className="h-3 w-3" />
              Negotiable
            </span>
          </div>
          <h1 className="mt-2 text-base font-semibold text-foreground leading-snug">{listing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 opacity-60" />{listing.location}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 opacity-60" />{timeAgo(listing.createdAt)}</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 opacity-60" />124 views</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Details</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Category", value: listing.category },
              { label: "Brand", value: listing.brand },
              { label: "Condition", value: listing.condition },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-secondary p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Description</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
        </div>

        {/* Tags */}
        {listing.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {listing.hashtags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <Tag className="h-3 w-3 opacity-60" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Seller Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{listing.seller.name}</span>
              {listing.seller.verified && <BadgeCheck className="h-4 w-4 text-verified" />}
            </div>
            <p className="text-xs text-muted-foreground">{listing.seller.college} · {listing.seller.year}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-xs">
            View Profile
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <div className="flex-1">
            <NegotiateDialog
              listingId={listing.id}
              sellerId={isDbListing ? (listing as any).seller_id || listing.id : listing.id}
              askingPrice={listing.price}
              listingTitle={listing.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
