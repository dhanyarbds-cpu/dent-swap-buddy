
-- Fix overly permissive insert policy: only service role should insert notifications
DROP POLICY "System can insert notifications" ON public.elite_notifications;

-- Create a security definer function to insert notifications (called by edge function)
CREATE OR REPLACE FUNCTION public.insert_elite_notification(
  p_user_id uuid,
  p_demand_alert_id uuid,
  p_listing_id uuid,
  p_title text,
  p_message text,
  p_match_score numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.elite_notifications (user_id, demand_alert_id, listing_id, title, message, match_score)
  VALUES (p_user_id, p_demand_alert_id, p_listing_id, p_title, p_message, p_match_score);
END;
$$;
