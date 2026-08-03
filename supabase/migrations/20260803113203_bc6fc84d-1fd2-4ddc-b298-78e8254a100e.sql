CREATE OR REPLACE FUNCTION public.accept_order(p_order_id uuid, p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  updated_row public.orders;
BEGIN
  IF caller_id IS NULL OR p_partner_id IS DISTINCT FROM caller_id THEN
    RETURN json_build_object('success', false, 'message', 'Not allowed');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = caller_id
      AND role = 'delivery'::public.user_role
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Delivery partner account required');
  END IF;

  UPDATE public.orders
  SET status = 'accepted'::public.order_status,
      delivery_id = caller_id
  WHERE id = p_order_id
    AND delivery_id IS NULL
    AND status = 'pending'::public.order_status
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Order already taken by another partner');
  END IF;

  RETURN json_build_object('success', true, 'order', row_to_json(updated_row));
END;
$$;

REVOKE ALL ON FUNCTION public.accept_order(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid, uuid) TO authenticated, service_role;