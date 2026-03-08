import { MapPin, Clock, BadgeCheck } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";

interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
}

const ProductCard = ({ listing, onClick }: ProductCardProps) => {
  const initials = listing.seller.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <button
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-200 dentzap-card-shadow hover:shadow-md active:scale-[0.98]"
    >
      {/* Image placeholder */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <div className="flex h-full items-center justify-center text-4xl text-muted-foreground/30">
          🦷
        </div>
        <div className="absolute left-2 top-2 rounded-md bg-card/90 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm">
          {listing.condition}
        </div>
        <div className="absolute bottom-2 right-2 rounded-md bg-primary/90 px-2.5 py-1 text-sm font-bold text-primary-foreground backdrop-blur-sm">
          {formatPrice(listing.price)}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-card-foreground">
          {listing.title}
        </h3>

        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {initials}
          </div>
          <span className="text-xs text-muted-foreground">{listing.seller.name}</span>
          {listing.seller.verified && (
            <BadgeCheck className="h-3.5 w-3.5 text-verified" />
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {listing.location.split(",")[0]}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {timeAgo(listing.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
