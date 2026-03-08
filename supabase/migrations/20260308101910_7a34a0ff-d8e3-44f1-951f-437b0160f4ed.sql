
CREATE TABLE public.promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  price_text TEXT,
  cta_text TEXT NOT NULL DEFAULT 'SHOP NOW',
  cta_link TEXT,
  image_url TEXT NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
ON public.promotional_banners
FOR SELECT
USING (is_active = true);
