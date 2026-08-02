CREATE OR REPLACE VIEW public.available_delivery_jobs
WITH (security_invoker = false)
AS
SELECT
  o.id,
  o.listing_id,
  o.farmer_id,
  o.buyer_id,
  o.quantity,
  o.total_price,
  o.status,
  o.delivery_address,
  o.pickup_address,
  o.pickup_lat,
  o.pickup_lng,
  o.delivery_lat,
  o.delivery_lng,
  o.scheduled_pickup_at,
  o.scheduled_delivery_at,
  o.delivery_fee,
  o.created_at,
  l.freshness_hours,
  l.harvest_date,
  l.crop_name
FROM public.orders o
JOIN public.crop_listings l ON l.id = o.listing_id
WHERE o.delivery_id IS NULL
  AND o.status IN ('pending'::public.order_status, 'accepted'::public.order_status)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'delivery'::public.user_role
  );

REVOKE ALL ON public.available_delivery_jobs FROM anon;
GRANT SELECT ON public.available_delivery_jobs TO authenticated;
GRANT ALL ON public.available_delivery_jobs TO service_role;