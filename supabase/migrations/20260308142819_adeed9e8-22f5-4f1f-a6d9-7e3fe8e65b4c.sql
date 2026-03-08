
-- Create blocked_listings log table
CREATE TABLE public.blocked_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  listing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocked listings" ON public.blocked_listings
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Service can insert blocked listings" ON public.blocked_listings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Validation trigger function
CREATE OR REPLACE FUNCTION public.validate_listing_min_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.price < 10 THEN
    INSERT INTO public.blocked_listings (seller_id, title, category, price, reason, listing_data)
    VALUES (
      NEW.seller_id,
      NEW.title,
      NEW.category,
      NEW.price,
      'Price below minimum ₹10',
      jsonb_build_object(
        'condition', NEW.condition,
        'brand', NEW.brand,
        'description', NEW.description,
        'location', NEW.location,
        'images', NEW.images
      )
    );
    RAISE EXCEPTION 'Minimum product price allowed is ₹10. Please update your listing.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_listing_min_price
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_listing_min_price();
