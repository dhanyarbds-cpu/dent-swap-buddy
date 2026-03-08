
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '📦',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Seed healthcare categories
INSERT INTO public.categories (name, icon, sort_order) VALUES
  ('Dental Instruments', '🦷', 1),
  ('Medical Equipment', '🏥', 2),
  ('Laboratory Equipment', '🔬', 3),
  ('Medical & Dental Books', '📚', 4),
  ('Surgical Instruments', '🩺', 5),
  ('Diagnostic Devices', '📊', 6),
  ('Clinic Furniture', '🪑', 7),
  ('Consumables & Supplies', '💊', 8),
  ('Student Equipment', '🎓', 9),
  ('Educational Materials', '📝', 10);
