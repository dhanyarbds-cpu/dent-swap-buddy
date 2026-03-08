import { MapPin, Clock, Heart } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";
import { useState } from "react";

interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
}

const ProductCard = ({ listing, onClick }: ProductCardProps) => {
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <div className="group relative w-full overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 dentzap-card-shadow hover:shadow-md">
      {/* Wishlist Heart */}
      <button
        onClick={(e) => { e.stopPropagation(); setWishlisted(!wishlisted); }}
        className="absolute right-2 top-2 z-10 rounded-full bg-card/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-card"
      >
        <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
      </button>

      {/* Featured Badge */}
      {listing.featured && (
        <div className="absolute left-0 top-2 z-10 rounded-r-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          Featured
        </div>
      )}

      {/* Image */}
      <button onClick={onClick} className="w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="flex h-full items-center justify-center text-4xl text-muted-foreground/20">
            🦷
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5 p-3">
          <p className="text-base font-bold text-foreground">{formatPrice(listing.price)}</p>
          <h3 className="line-clamp-2 text-xs leading-snug text-muted-foreground">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.location.split(",")[0]}</span>
            </span>
            <span className="flex items-center gap-0.5 shrink-0">
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
