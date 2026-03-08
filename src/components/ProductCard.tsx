import { MapPin, Clock, Heart, BadgeCheck } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";
import { useState } from "react";

interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
}

const ProductCard = ({ listing, onClick }: ProductCardProps) => {
  const [wishlisted, setWishlisted] = useState(false);
  const hasImage = listing.images && listing.images.length > 0 && listing.images[0];

  return (
    <div className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 dentzap-card-shadow hover:dentzap-card-shadow-hover">
      {/* Wishlist */}
      <button
        onClick={(e) => { e.stopPropagation(); setWishlisted(!wishlisted); }}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition-all duration-200 hover:scale-110"
      >
        <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
      </button>

      {/* Featured / Verified Badge */}
      {listing.featured && (
        <div className="absolute left-0 top-3 z-10 flex items-center gap-1 rounded-r-lg bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
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
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
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
        <div className="space-y-1 p-3">
          <p className="text-[15px] font-bold text-foreground">{formatPrice(listing.price)}</p>
          <h3 className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between pt-1.5 text-[10px] text-muted-foreground">
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
    </div>
  );
};

export default ProductCard;
