import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/delivery")({
  component: DeliveryDash,
});

interface Order {
  id: string; listing_id: string; farmer_id: string; buyer_id: string;
  quantity: number; total_price: number; status: string;
  delivery_address: string; buyer_phone: string | null; delivery_id: string | null;
  created_at: string;
}

function DeliveryDash() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [available, setAvailable] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from("orders").select("*").is("delivery_id", null).eq("status", "accepted").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("delivery_id", user.id).order("created_at", { ascending: false }),
    ]);
    setAvailable((a as Order[]) ?? []);
    setMine((m as Order[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const takeJob = async (id: string) => {
    const { error } = await supabase.from("orders").update({ delivery_id: user!.id }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Job accepted"); load(); }
  };
  const advance = async (id: string, to: "picked_up" | "delivered") => {
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t(to)); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("delivery_intro")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("available_jobs")}</h2>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_orders")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {available.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">₹{o.total_price} · {o.quantity} units</div>
                    <div className="text-sm text-muted-foreground">{o.delivery_address}</div>
                    {o.buyer_phone && <div className="text-xs text-muted-foreground">{o.buyer_phone}</div>}
                  </div>
                  <Button size="sm" onClick={() => takeJob(o.id)}>{t("accept")}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("my_jobs")}</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_orders")}</p>
        ) : (
          <div className="space-y-2">
            {mine.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">₹{o.total_price} · {o.quantity} units</div>
                    <div className="text-sm text-muted-foreground">{o.delivery_address}</div>
                    {o.buyer_phone && <div className="text-xs text-muted-foreground">{o.buyer_phone}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{t(o.status)}</Badge>
                    {o.status === "accepted" && <Button size="sm" onClick={() => advance(o.id, "picked_up")}>{t("mark_picked_up")}</Button>}
                    {o.status === "picked_up" && <Button size="sm" onClick={() => advance(o.id, "delivered")}>{t("mark_delivered")}</Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
