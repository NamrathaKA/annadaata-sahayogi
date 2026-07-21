import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Navigation } from "lucide-react";

export const Route = createFileRoute("/app/delivery")({
  component: DeliveryDash,
});

interface Order {
  id: string; listing_id: string; farmer_id: string; buyer_id: string;
  quantity: number; total_price: number; status: string;
  delivery_address: string; buyer_phone: string | null; delivery_id: string | null;
  pickup_address: string | null; pickup_lat: number | null; pickup_lng: number | null;
  delivery_lat: number | null; delivery_lng: number | null;
  farmer_phone: string | null;
  created_at: string;
}

function mapsUrl(lat: number | null, lng: number | null, address: string | null): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return "";
}

function ContactRow({ label, phone, address, lat, lng, t }: {
  label: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  t: (k: string) => string;
}) {
  const url = mapsUrl(lat, lng, address);
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {address && (
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="break-words">{address}</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {phone && (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${phone}`}>
              <Phone className="mr-1 h-3.5 w-3.5" /> {phone}
            </a>
          </Button>
        )}
        {url && (
          <Button asChild size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Navigation className="mr-1 h-3.5 w-3.5" /> {t("open_in_maps")}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function DeliveryDash() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [available, setAvailable] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: a }, { data: m }] = await Promise.all([
      (supabase.from as unknown as (name: string) => ReturnType<typeof supabase.from>)("available_delivery_jobs")
        .select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("delivery_id", user.id).order("created_at", { ascending: false }),
    ]);
    setAvailable(((a as unknown as Order[]) ?? []).map((o) => ({ ...o, buyer_phone: null, farmer_phone: null })));
    setMine((m as Order[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const takeJob = async (id: string) => {
    const { error } = await supabase.from("orders").update({ delivery_id: user!.id, status: "accepted" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Job accepted"); load(); }
  };
  const advance = async (id: string, to: "picked_up" | "delivered") => {
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t(to)); load(); }
  };

  const renderOrder = (o: Order, mineJob: boolean) => (
    <Card key={o.id} className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">₹{o.total_price} · {o.quantity} units</div>
          <div className="text-xs text-muted-foreground">
            {new Date(o.created_at).toLocaleString()}
          </div>
        </div>
        <Badge>{t(o.status)}</Badge>
      </div>

      <ContactRow
        label={t("pickup_location") + " · " + t("farmer_contact")}
        phone={mineJob ? o.farmer_phone : null}
        address={o.pickup_address}
        lat={o.pickup_lat}
        lng={o.pickup_lng}
        t={t}
      />
      <ContactRow
        label={t("delivery_address") + " · " + t("buyer_contact")}
        phone={mineJob ? o.buyer_phone : null}
        address={o.delivery_address}
        lat={o.delivery_lat}
        lng={o.delivery_lng}
        t={t}
      />

      <div className="flex flex-wrap gap-2 pt-1">
        {!mineJob && <Button size="sm" onClick={() => takeJob(o.id)}>{t("accept")}</Button>}
        {mineJob && o.status === "accepted" && <Button size="sm" onClick={() => advance(o.id, "picked_up")}>{t("mark_picked_up")}</Button>}
        {mineJob && o.status === "picked_up" && <Button size="sm" onClick={() => advance(o.id, "delivered")}>{t("mark_delivered")}</Button>}
      </div>
    </Card>
  );

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
            {available.map((o) => renderOrder(o, false))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("my_jobs")}</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_orders")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((o) => renderOrder(o, true))}
          </div>
        )}
      </section>
    </div>
  );
}
