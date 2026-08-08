ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee_buyer_share numeric,
  ADD COLUMN IF NOT EXISTS delivery_fee_farmer_share numeric,
  ADD COLUMN IF NOT EXISTS distance_km numeric;

ALTER TABLE public.available_delivery_jobs
  ADD COLUMN IF NOT EXISTS delivery_fee_buyer_share numeric,
  ADD COLUMN IF NOT EXISTS delivery_fee_farmer_share numeric,
  ADD COLUMN IF NOT EXISTS distance_km numeric;

CREATE OR REPLACE FUNCTION public.sync_available_delivery_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.delivery_id IS NULL AND NEW.status = 'accepted'::public.order_status THEN
    INSERT INTO public.available_delivery_jobs (
      id, listing_id, farmer_id, buyer_id, quantity, total_price, status,
      delivery_address, pickup_address, pickup_lat, pickup_lng, delivery_lat,
      delivery_lng, scheduled_pickup_at, scheduled_delivery_at, delivery_fee,
      created_at, freshness_hours, harvest_date, crop_name,
      delivery_fee_buyer_share, delivery_fee_farmer_share, distance_km
    )
    SELECT
      NEW.id, NEW.listing_id, NEW.farmer_id, NEW.buyer_id, NEW.quantity,
      NEW.total_price, NEW.status, NEW.delivery_address, NEW.pickup_address,
      NEW.pickup_lat, NEW.pickup_lng, NEW.delivery_lat, NEW.delivery_lng,
      NEW.scheduled_pickup_at, NEW.scheduled_delivery_at, NEW.delivery_fee,
      NEW.created_at, l.freshness_hours, l.harvest_date, l.crop_name,
      NEW.delivery_fee_buyer_share, NEW.delivery_fee_farmer_share, NEW.distance_km
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
      delivery_fee_buyer_share = EXCLUDED.delivery_fee_buyer_share,
      delivery_fee_farmer_share = EXCLUDED.delivery_fee_farmer_share,
      distance_km = EXCLUDED.distance_km,
      freshness_hours = EXCLUDED.freshness_hours,
      harvest_date = EXCLUDED.harvest_date,
      crop_name = EXCLUDED.crop_name;
  ELSE
    DELETE FROM public.available_delivery_jobs WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;