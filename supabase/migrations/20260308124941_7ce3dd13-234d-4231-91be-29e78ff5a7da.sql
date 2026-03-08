
-- Add proximity and frequency preferences to notification_preferences
ALTER TABLE public.notification_preferences 
  ADD COLUMN IF NOT EXISTS proximity_radius_km integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS alert_frequency text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS price_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tracking_alerts boolean NOT NULL DEFAULT true;

-- Add tracking_status to orders for milestone tracking
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS estimated_delivery timestamp with time zone,
  ADD COLUMN IF NOT EXISTS tracking_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Enable realtime for orders so buyers/sellers get live tracking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
