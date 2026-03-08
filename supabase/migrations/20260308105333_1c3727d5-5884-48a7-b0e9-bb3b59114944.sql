-- Create return_requests table
CREATE TABLE public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  seller_response TEXT,
  refund_amount NUMERIC,
  refund_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT valid_reason CHECK (reason IN ('not_as_described', 'damaged', 'wrong_item', 'quality_issue', 'no_longer_needed', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'product_returned', 'refund_completed'))
);

-- Enable RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- Buyers can create return requests for their orders
CREATE POLICY "Buyers can create return requests"
  ON public.return_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers and sellers can view their return requests
CREATE POLICY "Users can view their return requests"
  ON public.return_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Sellers can update return requests (respond)
CREATE POLICY "Sellers can update return requests"
  ON public.return_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Create storage bucket for return evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('return-evidence', 'return-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for return evidence
CREATE POLICY "Users can upload return evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'return-evidence');

CREATE POLICY "Anyone can view return evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'return-evidence');

-- Add trigger for updated_at
CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();