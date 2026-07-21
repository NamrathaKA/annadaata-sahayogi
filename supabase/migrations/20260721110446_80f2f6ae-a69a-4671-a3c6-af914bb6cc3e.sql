
DROP POLICY IF EXISTS "delivery read pending" ON public.orders;
DROP POLICY IF EXISTS "party update order" ON public.orders;

CREATE POLICY "delivery read pending" ON public.orders
FOR SELECT TO authenticated
USING (
  delivery_id IS NULL
  AND status IN ('pending','accepted')
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
);

CREATE POLICY "party update order" ON public.orders
FOR UPDATE TO authenticated
USING (
  auth.uid() = buyer_id
  OR auth.uid() = farmer_id
  OR auth.uid() = delivery_id
  OR (
    delivery_id IS NULL
    AND status IN ('pending','accepted')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
  )
)
WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = farmer_id OR auth.uid() = delivery_id
);

DROP FUNCTION IF EXISTS public.is_delivery_user(uuid);
