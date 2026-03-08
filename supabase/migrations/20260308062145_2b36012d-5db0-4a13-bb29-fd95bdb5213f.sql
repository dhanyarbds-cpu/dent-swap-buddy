
-- Elite membership flag on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_elite boolean NOT NULL DEFAULT false;

-- Demand alerts: tracks what elite users are looking for
CREATE TABLE public.demand_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  keywords text NOT NULL,
  category text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demand_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own demands"
ON public.demand_alerts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own demands"
ON public.demand_alerts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own demands"
ON public.demand_alerts FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own demands"
ON public.demand_alerts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Notifications table for elite alerts
CREATE TABLE public.elite_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  demand_alert_id uuid REFERENCES public.demand_alerts(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  match_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.elite_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.elite_notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.elite_notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.elite_notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.elite_notifications;

-- Index for fast matching
CREATE INDEX idx_demand_alerts_active ON public.demand_alerts(is_active, user_id);
CREATE INDEX idx_elite_notifications_user ON public.elite_notifications(user_id, is_read);
