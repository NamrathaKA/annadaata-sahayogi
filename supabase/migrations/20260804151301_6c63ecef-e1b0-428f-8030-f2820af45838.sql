CREATE OR REPLACE FUNCTION public.accept_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_partner_id
      AND role = 'delivery'::public.user_role
  ) THEN
    RAISE EXCEPTION 'Only delivery partners can accept orders' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET delivery_id = v_partner_id,
      status = 'accepted'::public.order_status
  WHERE id = p_order_id
    AND delivery_id IS NULL
    AND status = 'pending'::public.order_status
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order already taken by another partner'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'delivery_id', v_order.delivery_id,
    'status', v_order.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO service_role;