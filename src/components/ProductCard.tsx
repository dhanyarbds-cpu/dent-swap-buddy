import { MapPin, Clock, Heart, BadgeCheck, ExternalLink, MessageCircle, CalendarDays } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";
import { useWishlist } from "@/hooks/useWishlist";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
}

function formatUploadDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "New – Uploaded today";
  if (diffDays === 1) return "Uploaded yesterday";
  if (diffDays <= 3) return `Uploaded ${diffDays} days ago`;
  return `Uploaded on: ${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`;
}

const ProductCard = ({ listing, onClick }: ProductCardProps) => {
  const { wishlistedIds, toggle } = useWishlist();
  const wishlisted = wishlistedIds.has(listing.id);
  const hasImage = listing.images && listing.images.length > 0 && listing.images[0];
  const hasExternalLink = listing.external_link && listing.external_link.trim().length > 0;

  return (
    <div className="group relative w-full overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:glow-border">
      {/* Wishlist */}
      <button
        onClick={(e) => { e.stopPropagation(); toggle(listing.id); }}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-all duration-200 hover:scale-110"
      >
        <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
      </button>

      {/* Featured / Verified Badge */}
      {listing.featured && (
        <div className="absolute left-0 top-3 z-10 flex items-center gap-1 rounded-r-lg dentzap-gradient px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm glow-primary">
          Featured
        </div>
      )}
      {listing.seller.verified && !listing.featured && (
        <div className="absolute left-0 top-3 z-10 flex items-center gap-1 rounded-r-lg bg-verified px-2 py-1 text-[10px] font-bold text-verified-foreground shadow-sm">
          <BadgeCheck className="h-3 w-3" /> Verified
        </div>
      )}

      <button onClick={onClick} className="w-full text-left press-scale">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/30">
          {hasImage ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-muted-foreground/15 transition-transform duration-500 group-hover:scale-105">
              🦷
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1.5 p-3">
          <p className="text-[15px] font-bold text-foreground">{formatPrice(listing.price)}</p>
          <h3 className="line-clamp-2 text-xs font-medium leading-relaxed text-foreground">
            {listing.title}
          </h3>
          {listing.description && (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          )}

          {/* Upload date */}
          <div className="flex items-center gap-1 text-[10px] text-primary/70">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>{formatUploadDate(listing.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate">{listing.location.split(",")[0]}</span>
            </span>
            <span className="flex items-center gap-0.5 shrink-0 opacity-60">
              <Clock className="h-3 w-3" />
              {timeAgo(listing.createdAt)}
            </span>
          </div>
        </div>
      </button>

      {/* Action Button */}
      <div className="px-3 pb-3">
        {hasExternalLink ? (
          <a
            href={listing.external_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 hover:glow-border"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Link
          </a>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="w-full gap-1.5 rounded-xl border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 hover:text-primary"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Contact Seller
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
