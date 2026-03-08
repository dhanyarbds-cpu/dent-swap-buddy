
-- Product authenticity certificates with SHA-256 hash chain
CREATE TABLE public.product_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid NOT NULL,
  certificate_hash text NOT NULL,
  previous_hash text DEFAULT 'GENESIS',
  product_name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  condition text NOT NULL DEFAULT '',
  seller_name text NOT NULL DEFAULT '',
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_count integer NOT NULL DEFAULT 0,
  is_valid boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: one certificate per listing
ALTER TABLE public.product_certificates ADD CONSTRAINT unique_listing_cert UNIQUE (listing_id);

-- RLS
ALTER TABLE public.product_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates viewable by everyone"
  ON public.product_certificates FOR SELECT
  USING (true);

CREATE POLICY "Sellers can request certificates"
  ON public.product_certificates FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- In-app notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
