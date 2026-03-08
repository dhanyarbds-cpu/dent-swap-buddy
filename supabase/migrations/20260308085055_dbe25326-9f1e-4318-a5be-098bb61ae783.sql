
-- Buyer trust scores table
CREATE TABLE public.buyer_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL UNIQUE,
  trust_score numeric NOT NULL DEFAULT 100,
  total_purchases integer NOT NULL DEFAULT 0,
  false_complaints integer NOT NULL DEFAULT 0,
  total_complaints integer NOT NULL DEFAULT 0,
  is_restricted boolean NOT NULL DEFAULT false,
  restricted_at timestamptz,
  restrict_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own buyer trust" ON public.buyer_trust_scores
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

-- Account health flags table
CREATE TABLE public.account_health_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  reason text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_health_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health flags" ON public.account_health_flags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
