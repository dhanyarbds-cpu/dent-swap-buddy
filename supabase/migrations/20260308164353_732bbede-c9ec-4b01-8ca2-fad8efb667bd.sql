-- Add Stripe Connect account ID to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;