
ALTER TABLE public.crop_listings
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS farmer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision;

CREATE OR REPLACE FUNCTION public.enrich_order_from_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT l.location, l.pickup_lat, l.pickup_lng
    INTO NEW.pickup_address, NEW.pickup_lat, NEW.pickup_lng
  FROM public.crop_listings l
  WHERE l.id = NEW.listing_id;

  SELECT p.phone INTO NEW.farmer_phone
  FROM public.profiles p
  WHERE p.id = NEW.farmer_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enrich_order_from_listing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enrich_order_before_insert ON public.orders;
CREATE TRIGGER enrich_order_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enrich_order_from_listing();
