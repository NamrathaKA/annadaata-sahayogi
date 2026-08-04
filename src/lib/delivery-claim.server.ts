import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function claimDeliveryOrder(
  supabase: SupabaseClient<Database>,
  userId: string,
  orderId: string,
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (profile?.role !== "delivery") throw new Error("Only delivery partners can accept orders");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: claimed, error } = await supabaseAdmin
    .from("orders")
    .update({ delivery_id: userId, status: "accepted" })
    .eq("id", orderId)
    .is("delivery_id", null)
    .eq("status", "pending")
    .select("id, delivery_id, status")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!claimed || claimed.delivery_id !== userId) {
    return { success: false as const, message: "Order already taken by another partner" };
  }

  return { success: true as const, order: claimed };
}