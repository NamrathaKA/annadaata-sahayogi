DROP VIEW IF EXISTS public.available_delivery_jobs;

CREATE TABLE public.available_delivery_jobs (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL,
  farmer_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  quantity numeric NOT NULL,
  total_price numeric NOT NULL,
  status public.order_status NOT NULL,
  delivery_address text NOT NULL,
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  scheduled_pickup_at timestamptz,
  scheduled_delivery_at timestamptz,
  delivery_fee numeric,
  created_at timestamptz NOT NULL,
  freshness_hours integer NOT NULL DEFAULT 48,
  harvest_date date,
  crop_name text NOT NULL
);

GRANT SELECT ON public.available_delivery_jobs TO authenticated;
GRANT ALL ON public.available_delivery_jobs TO service_role;
ALTER TABLE public.available_delivery_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery users read available jobs"
ON public.available_delivery_jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'delivery'::public.user_role
  )
);

CREATE OR REPLACE FUNCTION public.sync_available_delivery_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_id IS NULL AND NEW.status IN ('pending'::public.order_status, 'accepted'::public.order_status) THEN
    INSERT INTO public.available_delivery_jobs (
      id, listing_id, farmer_id, buyer_id, quantity, total_price, status,
      delivery_address, pickup_address, pickup_lat, pickup_lng, delivery_lat,
      delivery_lng, scheduled_pickup_at, scheduled_delivery_at, delivery_fee,
      created_at, freshness_hours, harvest_date, crop_name
    )
    SELECT
      NEW.id, NEW.listing_id, NEW.farmer_id, NEW.buyer_id, NEW.quantity,
      NEW.total_price, NEW.status, NEW.delivery_address, NEW.pickup_address,
      NEW.pickup_lat, NEW.pickup_lng, NEW.delivery_lat, NEW.delivery_lng,
      NEW.scheduled_pickup_at, NEW.scheduled_delivery_at, NEW.delivery_fee,
      NEW.created_at, l.freshness_hours, l.harvest_date, l.crop_name
    FROM public.crop_listings l
    WHERE l.id = NEW.listing_id
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      delivery_address = EXCLUDED.delivery_address,
      pickup_address = EXCLUDED.pickup_address,
      pickup_lat = EXCLUDED.pickup_lat,
      pickup_lng = EXCLUDED.pickup_lng,
      delivery_lat = EXCLUDED.delivery_lat,
      delivery_lng = EXCLUDED.delivery_lng,
      scheduled_pickup_at = EXCLUDED.scheduled_pickup_at,
      scheduled_delivery_at = EXCLUDED.scheduled_delivery_at,
      delivery_fee = EXCLUDED.delivery_fee,
      freshness_hours = EXCLUDED.freshness_hours,
      harvest_date = EXCLUDED.harvest_date,
      crop_name = EXCLUDED.crop_name;
  ELSE
    DELETE FROM public.available_delivery_jobs WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_available_delivery_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_available_delivery_job() TO service_role;

CREATE TRIGGER sync_available_delivery_job_after_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_available_delivery_job();