
-- Seller analytics: track product views and clicks
CREATE TABLE public.product_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  viewer_id uuid,
  event_type text NOT NULL DEFAULT 'view', -- 'view', 'click', 'message', 'purchase'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_analytics_listing ON public.product_analytics(listing_id);
CREATE INDEX idx_product_analytics_seller ON public.product_analytics(seller_id);
CREATE INDEX idx_product_analytics_created ON public.product_analytics(created_at);

ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics events (views/clicks)
CREATE POLICY "Anyone can insert analytics" ON public.product_analytics
FOR INSERT TO authenticated WITH CHECK (true);

-- Sellers can view their own analytics
CREATE POLICY "Sellers can view own analytics" ON public.product_analytics
FOR SELECT TO authenticated USING (auth.uid() = seller_id);

-- Gamification badges table
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL, -- 'top_seller', 'trusted_buyer', 'fast_responder', 'first_sale', 'power_lister'
  badge_name text NOT NULL,
  badge_icon text NOT NULL DEFAULT '🏅',
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone" ON public.user_badges
FOR SELECT USING (true);

-- Referral system
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'credited'
  credit_amount numeric NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals" ON public.referrals
FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);

-- Platform credits for referral rewards
CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'referral', -- 'referral', 'reward', 'promotion'
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.user_credits
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.user_credits
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
