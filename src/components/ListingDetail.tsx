import { useState, useEffect } from "react";
import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, Tag, IndianRupee, Eye, Clock, Bookmark, ChevronLeft, ChevronRight, ShoppingCart, Truck, ShieldAlert, AlertTriangle, Flag, Building2 } from "lucide-react";
import { type Listing, formatPrice, timeAgo } from "@/lib/mockData";
import NegotiateDialog from "@/components/NegotiateDialog";
import { Button } from "@/components/ui/button";
import CheckoutPage from "@/pages/CheckoutPage";
import ReportProductDialog from "@/components/ReportProductDialog";
import { useWishlist } from "@/hooks/useWishlist";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ListingDetailProps {
  listing: Listing;
  onBack: () => void;
}

const ListingDetail = ({ listing, onBack }: ListingDetailProps) => {
  const { user } = useAuth();
  const initials = listing.seller.name.split(" ").map((n) => n[0]).join("");
  const isDbListing = listing.id.length > 10;
  const hasImages = listing.images && listing.images.length > 0 && listing.images[0];
  const [currentImage, setCurrentImage] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const imageCount = hasImages ? listing.images.length : 0;
  const { wishlistedIds, toggle } = useWishlist();
  const wishlisted = wishlistedIds.has(listing.id);

  // Track product view
  useEffect(() => {
    const sellerId = (listing.seller as any).id || (listing as any).seller_id;
    if (isDbListing && user && sellerId && sellerId !== user.id) {
      supabase.from("product_analytics").insert({
        listing_id: listing.id,
        seller_id: sellerId,
        viewer_id: user.id,
        event_type: "view",
      }).then(() => {});
    }
  }, [listing.id]);

  // Delivery options from DB listing
  const pickupAvailable = (listing as any).pickup_available ?? true;
  const shippingAvailable = (listing as any).shipping_available ?? false;

  if (showCheckout) {
    return (
      <CheckoutPage
        listing={listing}
        onBack={() => setShowCheckout(false)}
      />
    );
  }

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
          <button
            onClick={() => toggle(listing.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition hover:bg-muted"
          >
            <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive text-destructive" : ""}`} />
          </button>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {hasImages ? (
          <>
            <img
              src={listing.images[currentImage]}
              alt={`${listing.title} - ${currentImage + 1}`}
              className="h-full w-full object-cover"
            />
            {imageCount > 1 && (
              <>
                {currentImage > 0 && (
                  <button
                    onClick={() => setCurrentImage((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {currentImage < imageCount - 1 && (
                  <button
                    onClick={() => setCurrentImage((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {listing.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentImage ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute right-3 top-3 rounded-full bg-foreground/50 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                  {currentImage + 1}/{imageCount}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-7xl text-muted-foreground/10">🦷</div>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasImages && imageCount > 1 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto bg-card px-4 py-2">
          {listing.images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrentImage(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === currentImage ? "border-primary" : "border-transparent opacity-60"
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-lg space-y-4 p-4 pb-28 animate-slide-up">
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

        {/* Delivery Options Badges */}
        <div className="flex flex-wrap gap-2">
          {pickupAvailable && (
            <span className="flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1.5 text-[11px] font-semibold text-verified">
              <MapPin className="h-3 w-3" /> Local Pickup
            </span>
          )}
          {shippingAvailable && (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
              <Truck className="h-3 w-3" /> Shipping Available
            </span>
          )}
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

        {/* Delivery Info */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Delivery & Transaction</h2>
          <div className="space-y-2">
            {pickupAvailable && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                <div>
                  <p className="text-sm font-medium text-foreground">Local Pickup</p>
                  <p className="text-xs text-muted-foreground">Meet the seller in {listing.location}. Inspect the item before paying.</p>
                </div>
              </div>
            )}
            {shippingAvailable && (
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Courier Shipping</p>
                  <p className="text-xs text-muted-foreground">Shipping via India Post, DTDC, Delhivery, or other couriers. Discuss shipping cost and details in chat.</p>
                </div>
              </div>
            )}
          </div>
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
        {(listing as any).seller_type === "company" && (listing as any).company_name ? (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            {(listing as any).company_logo ? (
              <img src={(listing as any).company_logo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{(listing as any).company_name}</span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">Official</span>
              </div>
              <p className="text-xs text-primary font-medium">Company Seller</p>
            </div>
          </div>
        ) : (
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
        )}

        {/* Report Product */}
        {isDbListing && (
          <ReportProductDialog
            listingId={listing.id}
            sellerId={(listing as any).seller_id || listing.id}
            productName={listing.title}
            sellerName={listing.seller.name}
          >
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-3 text-sm font-medium text-destructive transition hover:bg-destructive/10">
              <Flag className="h-4 w-4" />
              Report Product
            </button>
          </ReportProductDialog>
        )}

        {/* Safety Tips */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Safety Tips</p>
          </div>
          <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400/80">
            <li>• Meet in public places for local pickups</li>
            <li>• Inspect the item before making payment</li>
            <li>• Avoid advance payments to unknown sellers</li>
            <li>• Use trusted courier services for shipping</li>
            <li>• Verify seller ratings and reviews</li>
          </ul>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-[var(--tab-bar-height)] left-0 right-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg gap-3">
          <div className="flex-1">
            <NegotiateDialog
              listingId={listing.id}
              sellerId={isDbListing ? (listing as any).seller_id || listing.id : listing.id}
              askingPrice={listing.price}
              listingTitle={listing.title}
            />
          </div>
          {isDbListing && (
            <Button
              onClick={() => setShowCheckout(true)}
              className="flex-1 gap-2 dentzap-gradient rounded-xl py-5 text-sm font-semibold text-primary-foreground dentzap-shadow"
            >
              <ShoppingCart className="h-4 w-4" /> Buy Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
