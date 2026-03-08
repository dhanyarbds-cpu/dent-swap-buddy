
-- Update referrals: credit_amount now means number of commission-free sales (2 per referral)
ALTER TABLE public.referrals ALTER COLUMN credit_amount SET DEFAULT 2;
UPDATE public.referrals SET credit_amount = 2 WHERE credit_amount = 20;
