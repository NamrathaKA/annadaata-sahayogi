CREATE OR REPLACE FUNCTION public.accept_order(p_order_id uuid, p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.orders;
BEGIN
  IF p_partner_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'message', 'Not allowed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'delivery'::public.user_role
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Only delivery partners can accept orders');
  END IF;

  UPDATE public.orders
  SET status = 'accepted'::public.order_status,
      delivery_id = p_partner_id
  WHERE id = p_order_id
    AND delivery_id IS NULL
    AND status IN ('pending'::public.order_status, 'accepted'::public.order_status)
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Order already taken by another partner');
  END IF;

  RETURN json_build_object('success', true, 'order', row_to_json(updated_row));
END;
$$;

REVOKE ALL ON FUNCTION public.accept_order(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid, uuid) TO authenticated;