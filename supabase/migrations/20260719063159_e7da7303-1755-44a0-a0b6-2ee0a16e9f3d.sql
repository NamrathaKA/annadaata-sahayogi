
-- Enum for role
CREATE TYPE public.user_role AS ENUM ('farmer', 'buyer', 'delivery');
CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'expired');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'farmer',
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'kn',
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Allow authenticated users to look up other profiles' basic public info (for order display)
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Crop listings
CREATE TABLE public.crop_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC NOT NULL CHECK (price_per_unit >= 0),
  location TEXT NOT NULL DEFAULT '',
  harvest_date DATE,
  description TEXT,
  image_url TEXT,
  status public.listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crop_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_listings TO authenticated;
GRANT ALL ON public.crop_listings TO service_role;
ALTER TABLE public.crop_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active listings" ON public.crop_listings FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "auth read all listings" ON public.crop_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "farmer insert own listing" ON public.crop_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "farmer update own listing" ON public.crop_listings FOR UPDATE TO authenticated USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "farmer delete own listing" ON public.crop_listings FOR DELETE TO authenticated USING (auth.uid() = farmer_id);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.crop_listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  delivery_address TEXT NOT NULL,
  buyer_phone TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Parties on the order can read
CREATE POLICY "party read order" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id OR auth.uid() = delivery_id);
-- Deliveries can also see pending unassigned orders to accept
CREATE POLICY "delivery read pending" ON public.orders FOR SELECT TO authenticated
  USING (delivery_id IS NULL AND status IN ('pending','accepted'));

CREATE POLICY "buyer insert order" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Any party may update (status transitions enforced in app)
CREATE POLICY "party update order" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = farmer_id OR auth.uid() = delivery_id
         OR (delivery_id IS NULL AND status IN ('pending','accepted')))
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = farmer_id OR auth.uid() = delivery_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.crop_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup (role/name from user metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, language)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'farmer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'language', 'kn')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
