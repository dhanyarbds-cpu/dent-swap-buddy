
-- Seller payout details table
CREATE TABLE public.seller_payout_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE,
  payout_method TEXT NOT NULL DEFAULT 'upi',
  upi_id TEXT,
  account_holder_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_payout_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout details" ON public.seller_payout_details
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert own payout details" ON public.seller_payout_details
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own payout details" ON public.seller_payout_details
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

-- Add buyer_service_fee column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_service_fee NUMERIC DEFAULT 0;

-- Update platform_settings commission to new model
UPDATE public.platform_settings 
SET value = '{"rate": 1, "buyer_fee_rate": 1, "min_price": 0}'::jsonb
WHERE key = 'commission';
