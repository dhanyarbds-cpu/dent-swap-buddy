
-- Platform settings table for admin-configurable commission rate
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings, only service role can write
CREATE POLICY "Platform settings are viewable by everyone"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Insert default commission rate (2%)
INSERT INTO public.platform_settings (key, value) VALUES
  ('commission', '{"rate": 2, "min_price": 100}'::jsonb);

-- Add commission columns to orders table
ALTER TABLE public.orders
  ADD COLUMN commission_rate numeric DEFAULT 0,
  ADD COLUMN commission_amount numeric DEFAULT 0,
  ADD COLUMN seller_payout numeric DEFAULT 0;
