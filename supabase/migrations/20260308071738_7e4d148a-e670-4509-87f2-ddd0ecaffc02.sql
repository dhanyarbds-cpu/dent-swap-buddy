
-- Add delivery options to listings
ALTER TABLE public.listings
  ADD COLUMN pickup_available boolean NOT NULL DEFAULT true,
  ADD COLUMN shipping_available boolean NOT NULL DEFAULT false;

-- Add delivery/tracking fields to orders
ALTER TABLE public.orders
  ADD COLUMN delivery_method text NOT NULL DEFAULT 'pickup',
  ADD COLUMN courier_name text,
  ADD COLUMN tracking_number text,
  ADD COLUMN shipping_address text,
  ADD COLUMN shipping_cost numeric DEFAULT 0;
