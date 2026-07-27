
ALTER TABLE public.crop_listings ADD COLUMN IF NOT EXISTS freshness_hours integer NOT NULL DEFAULT 48;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_delivery_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2);

DROP VIEW IF EXISTS public.available_delivery_jobs;
CREATE VIEW public.available_delivery_jobs
WITH (security_invoker = true)
AS
SELECT
  o.id, o.listing_id, o.farmer_id, o.buyer_id, o.quantity, o.total_price,
  o.status, o.delivery_address, o.pickup_address,
  o.pickup_lat, o.pickup_lng, o.delivery_lat, o.delivery_lng,
  o.scheduled_pickup_at, o.scheduled_delivery_at, o.delivery_fee,
  o.created_at,
  l.freshness_hours, l.harvest_date, l.crop_name
FROM public.orders o
JOIN public.crop_listings l ON l.id = o.listing_id
WHERE o.delivery_id IS NULL AND o.status IN ('pending','accepted');

GRANT SELECT ON public.available_delivery_jobs TO authenticated;
