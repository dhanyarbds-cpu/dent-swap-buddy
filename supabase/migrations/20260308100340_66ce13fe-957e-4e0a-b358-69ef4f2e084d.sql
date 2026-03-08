
-- Company profiles table
CREATE TABLE public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  brand_name TEXT DEFAULT '',
  business_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  website TEXT DEFAULT '',
  business_address TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  verification_doc_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add seller_type to listings
ALTER TABLE public.listings ADD COLUMN seller_type TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE public.listings ADD COLUMN company_profile_id UUID REFERENCES public.company_profiles(id);

-- RLS for company_profiles
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view approved companies
CREATE POLICY "Approved companies viewable by everyone"
ON public.company_profiles FOR SELECT
USING (status = 'approved' OR auth.uid() = user_id);

-- Users can create their own company profile
CREATE POLICY "Users can create own company profile"
ON public.company_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own company profile
CREATE POLICY "Users can update own company profile"
ON public.company_profiles FOR UPDATE
USING (auth.uid() = user_id);
