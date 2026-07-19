
-- Helper to check delivery role without recursive RLS
CREATE OR REPLACE FUNCTION public.is_delivery_user(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'delivery'
  )
$$;

-- profiles: drop broad read
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;

-- orders: restrict delivery-pending read to delivery users
DROP POLICY IF EXISTS "delivery read pending" ON public.orders;
CREATE POLICY "delivery read pending"
ON public.orders FOR SELECT
TO authenticated
USING (
  delivery_id IS NULL
  AND status IN ('pending','accepted')
  AND public.is_delivery_user(auth.uid())
);

-- orders: restrict update on unassigned to delivery users
DROP POLICY IF EXISTS "party update order" ON public.orders;
CREATE POLICY "party update order"
ON public.orders FOR UPDATE
TO authenticated
USING (
  auth.uid() = buyer_id
  OR auth.uid() = farmer_id
  OR auth.uid() = delivery_id
  OR (
    delivery_id IS NULL
    AND status IN ('pending','accepted')
    AND public.is_delivery_user(auth.uid())
  )
)
WITH CHECK (
  auth.uid() = buyer_id
  OR auth.uid() = farmer_id
  OR auth.uid() = delivery_id
);
