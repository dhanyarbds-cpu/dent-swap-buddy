
-- Allow admins to view all seller payout details
CREATE POLICY "Admins can view all payout details"
ON public.seller_payout_details
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
