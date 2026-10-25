-- =============================================
-- Yuric Topup — Orders + Security Schema
-- =============================================

-- 1. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text NOT NULL,
  game_id     text NOT NULL,
  game_name   text NOT NULL,
  package_amt text NOT NULL,
  price_usd   numeric(10,2) NOT NULL,
  payment     text NOT NULL DEFAULT 'Bakong',
  player_id   text NOT NULL,
  player_zone text,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','processing','completed','failed','refunded')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Row Level Security — users see only their own orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Owner (yurictopup@gmail.com) sees ALL orders
CREATE POLICY "owner_all" ON public.orders
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

-- Users see only their own orders
CREATE POLICY "user_own_orders" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "user_insert_order" ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Profiles table (extra user info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  display_name text,
  telegram   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_profiles" ON public.profiles
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

CREATE POLICY "user_own_profile" ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Indexes for fast queries
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
