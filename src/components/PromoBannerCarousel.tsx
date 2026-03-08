import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Fallback banners using local assets
import promoBanner1 from "@/assets/promo-banner-1.jpg";
import promoBanner2 from "@/assets/promo-banner-2.jpg";
import promoBanner3 from "@/assets/promo-banner-3.jpg";
import promoBanner4 from "@/assets/promo-banner-4.jpg";

interface PromoBanner {
  id: string;
  title: string;
  tagline: string;
  price_text: string | null;
  cta_text: string;
  cta_link: string | null;
  image_url: string;
  listing_id: string | null;
}

const fallbackBanners: PromoBanner[] = [
  {
    id: "1",
    title: "Stethoscope Deal",
    tagline: "Hear Every Beat Clearly",
    price_text: "₹2,999",
    cta_text: "SHOP NOW",
    cta_link: "/search?q=stethoscope",
    image_url: promoBanner1,
    listing_id: null,
  },
  {
    id: "2",
    title: "Anatomy Models",
    tagline: "Master Anatomy with Crystal Clear Detail",
    price_text: "₹4,499",
    cta_text: "BUY NOW",
    cta_link: "/search?q=anatomy",
    image_url: promoBanner2,
    listing_id: null,
  },
  {
    id: "3",
    title: "Dissection Kits",
    tagline: "Zero Setup Hassle – Pure Detail Mastery",
    price_text: "₹1,499",
    cta_text: "GET NOW",
    cta_link: "/search?q=dissection",
    image_url: promoBanner3,
    listing_id: null,
  },
  {
    id: "4",
    title: "Study Essentials",
    tagline: "Ace Your Exams with the Right Tools",
    price_text: "₹899",
    cta_text: "SHOP NOW",
    cta_link: "/search?q=textbooks",
    image_url: promoBanner4,
    listing_id: null,
  },
];

const PromoBannerCarousel = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<PromoBanner[]>(fallbackBanners);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from("promotional_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data && data.length > 0) {
        setBanners(data);
      }
    };
    fetchBanners();
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + banners.length) % banners.length), [banners.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const handleCta = (banner: PromoBanner) => {
    if (banner.cta_link) navigate(banner.cta_link);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    setTouchStart(null);
  };

  if (banners.length === 0) return null;

  return (
    <div className="px-4 pt-4 pb-1">
      <div
        className="relative overflow-hidden rounded-2xl border border-border/30"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner image */}
        <div className="relative aspect-[3/4] max-h-[420px] w-full overflow-hidden">
          {banners.map((banner, i) => (
            <img
              key={banner.id}
              src={banner.image_url}
              alt={banner.tagline}
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"
              }`}
            />
          ))}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            {/* Price badge */}
            {banners[current].price_text && (
              <span className="mb-2 w-fit rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/30 animate-fade-in">
                {banners[current].price_text}
              </span>
            )}

            {/* Tagline */}
            <h3 className="text-xl font-bold text-white leading-tight drop-shadow-lg animate-fade-in">
              {banners[current].tagline}
            </h3>

            {/* CTA Button */}
            <button
              onClick={() => handleCta(banners[current])}
              className="mt-3 w-fit rounded-xl bg-gradient-to-r from-primary to-galaxy-violet px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 hover:scale-105 active:scale-95 animate-fade-in"
            >
              {banners[current].cta_text}
            </button>
          </div>

          {/* Navigation arrows */}
          {banners.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/80 backdrop-blur-sm transition hover:bg-black/50"
                aria-label="Previous banner"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/80 backdrop-blur-sm transition hover:bg-black/50"
                aria-label="Next banner"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoBannerCarousel;
