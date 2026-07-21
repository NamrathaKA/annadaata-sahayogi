
-- Remove broad row-level read of pending orders (which exposed phone columns)
DROP POLICY IF EXISTS "delivery read pending" ON public.orders;

-- Safe view: no phone numbers, only unassigned pending/accepted jobs, only for delivery-role users
CREATE OR REPLACE VIEW public.available_delivery_jobs
WITH (security_invoker = off, security_barrier = on) AS
SELECT
  o.id, o.listing_id, o.farmer_id, o.buyer_id,
  o.quantity, o.total_price, o.status,
  o.pickup_address, o.pickup_lat, o.pickup_lng,
  o.delivery_address, o.delivery_lat, o.delivery_lng,
  o.created_at
FROM public.orders o
WHERE o.delivery_id IS NULL
  AND o.status IN ('pending','accepted')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'delivery'
  );

REVOKE ALL ON public.available_delivery_jobs FROM PUBLIC, anon;
GRANT SELECT ON public.available_delivery_jobs TO authenticated;

-- Delivery partners still need to be able to claim (UPDATE) an unassigned pending/accepted order.
-- Keep the existing "party update order" policy which already handles this via EXISTS on profiles.
