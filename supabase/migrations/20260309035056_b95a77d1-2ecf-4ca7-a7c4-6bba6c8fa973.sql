-- Enable realtime for chat_requests so both parties see live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;

-- Create trigger to notify seller when a new chat request arrives
CREATE OR REPLACE FUNCTION public.notify_new_chat_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing_title text;
  v_buyer_name text;
BEGIN
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  SELECT full_name INTO v_buyer_name FROM public.profiles WHERE user_id = NEW.buyer_id;
  
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    NEW.seller_id,
    '💬 New Negotiation Request',
    COALESCE(v_buyer_name, 'A buyer') || ' wants to negotiate on "' || COALESCE(v_listing_title, 'your listing') || '"' ||
    CASE WHEN NEW.offered_price IS NOT NULL THEN ' — Offer: ₹' || NEW.offered_price::text ELSE '' END,
    'chat',
    jsonb_build_object('chat_request_id', NEW.id, 'listing_id', NEW.listing_id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_chat_request
  AFTER INSERT ON public.chat_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_request();