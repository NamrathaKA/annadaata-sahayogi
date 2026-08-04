import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { claimDeliveryOrder } from "@/lib/delivery-claim.server";

export const acceptDeliveryOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(({ data, context }) =>
    claimDeliveryOrder(context.supabase, context.userId, data.orderId),
  );