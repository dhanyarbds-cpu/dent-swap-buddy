
-- Complaints table
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  proof_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  seller_response text,
  seller_responded_at timestamptz,
  resolution text,
  resolved_at timestamptz,
  ai_analysis jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create complaints" ON public.complaints
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can view complaints" ON public.complaints
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Sellers can respond to complaints" ON public.complaints
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

-- Seller warnings table
CREATE TABLE public.seller_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  warning_level integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  action_taken text NOT NULL DEFAULT 'warning',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own warnings" ON public.seller_warnings
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);

-- Seller trust scores table
CREATE TABLE public.seller_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  trust_score numeric NOT NULL DEFAULT 100,
  total_complaints integer NOT NULL DEFAULT 0,
  resolved_complaints integer NOT NULL DEFAULT 0,
  unresolved_complaints integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_at timestamptz,
  block_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trust scores are viewable by everyone" ON public.seller_trust_scores
  FOR SELECT TO authenticated USING (true);

-- Add is_blocked to profiles for quick checks
ALTER TABLE public.profiles ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN blocked_reason text;
