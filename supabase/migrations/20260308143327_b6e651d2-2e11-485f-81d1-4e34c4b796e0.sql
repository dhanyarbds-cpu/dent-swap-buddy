
-- Create a function to auto-insert delivery notifications
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing_title text;
  v_buyer_id uuid;
  v_seller_id uuid;
  v_msg text;
BEGIN
  v_buyer_id := NEW.buyer_id;
  v_seller_id := NEW.seller_id;
  
  -- Get listing title
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  v_listing_title := COALESCE(v_listing_title, 'your order');

  -- Notify on tracking status change
  IF OLD.tracking_status IS DISTINCT FROM NEW.tracking_status THEN
    CASE NEW.tracking_status
      WHEN 'packed' THEN v_msg := 'Your order "' || v_listing_title || '" has been packed by the seller.';
      WHEN 'shipped' THEN v_msg := 'Your order "' || v_listing_title || '" has been shipped! Track it in your orders.';
      WHEN 'in_transit' THEN v_msg := 'Your order "' || v_listing_title || '" is in transit.';
      WHEN 'out_for_delivery' THEN v_msg := 'Your order "' || v_listing_title || '" is out for delivery!';
      WHEN 'delivered' THEN v_msg := 'Your order "' || v_listing_title || '" has been delivered. Please confirm receipt.';
      WHEN 'ready' THEN v_msg := 'Your order "' || v_listing_title || '" is ready for pickup!';
      WHEN 'confirmed' THEN v_msg := 'The seller has confirmed your order "' || v_listing_title || '".';
      ELSE v_msg := NULL;
    END CASE;
    
    IF v_msg IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (v_buyer_id, 'Delivery Update', v_msg, 'delivery', jsonb_build_object('order_id', NEW.id));
    END IF;
  END IF;

  -- Notify seller when buyer confirms delivery (status changes to completed)
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (v_seller_id, 'Delivery Confirmed ✓', 'The buyer confirmed delivery of "' || v_listing_title || '". Payment has been released!', 'payment', jsonb_build_object('order_id', NEW.id));
  END IF;

  -- Notify buyer when tracking number is added
  IF OLD.tracking_number IS NULL AND NEW.tracking_number IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (v_buyer_id, 'Tracking Added', 'Tracking number added for "' || v_listing_title || '": ' || NEW.courier_name || ' - ' || NEW.tracking_number, 'delivery', jsonb_build_object('order_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();

-- Allow service/trigger to insert notifications (currently blocked)
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
