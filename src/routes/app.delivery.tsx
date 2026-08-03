import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Phone, Navigation, Sparkles, Clock } from "lucide-react";

const SCHEDULABLE_STATUSES = new Set(["pending", "accepted"]);

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Simple fee model: base ₹40 + ₹12/km + ₹2 per unit quantity, rounded to ₹5.
function suggestFee(km: number | null, quantity: number): number {
  const base = 40;
  const perKm = 12;
  const perUnit = 2;
  const raw = base + (km ?? 5) * perKm + quantity * perUnit;
  return Math.max(50, Math.round(raw / 5) * 5);
}

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
  scheduled_pickup_at: string | null;
  scheduled_delivery_at: string | null;
  delivery_fee: number | null;
  freshness_hours?: number | null;
  harvest_date?: string | null;
  crop_name?: string | null;
  created_at: string;
}

function mapsUrl(lat: number | null, lng: number | null, address: string | null): string {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  return "";
}

function ContactRow({ label, phone, address, lat, lng, t }: {
  label: string; phone: string | null; address: string | null;
  lat: number | null; lng: number | null; t: (k: string) => string;
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
            <a href={`tel:${phone}`}><Phone className="mr-1 h-3.5 w-3.5" /> {phone}</a>
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

function TripPlanner({
  order, onRequestSave, t,
}: {
  order: Order;
  onRequestSave: (pickup: string, delivery: string, fee: number) => void;
  t: (k: string) => string;
}) {
  const [pickup, setPickup] = useState<string>(toLocalInput(order.scheduled_pickup_at));
  const [delivery, setDelivery] = useState<string>(toLocalInput(order.scheduled_delivery_at));
  const [fee, setFee] = useState<string>(order.delivery_fee != null ? String(order.delivery_fee) : "");
  const [aiBusy, setAiBusy] = useState(false);
  const disabled = !SCHEDULABLE_STATUSES.has(order.status);
  const min = nowLocalInput();
  const freshnessHours = order.freshness_hours ?? 48;

  const distanceKm = useMemo(() => {
    if (order.pickup_lat != null && order.pickup_lng != null && order.delivery_lat != null && order.delivery_lng != null) {
      return haversineKm(
        { lat: order.pickup_lat, lng: order.pickup_lng },
        { lat: order.delivery_lat, lng: order.delivery_lng },
      );
    }
    return null;
  }, [order]);

  const handleSuggestFee = () => {
    setFee(String(suggestFee(distanceKm, order.quantity)));
  };

  const handleAiPlan = async () => {
    setAiBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/crop-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({
          action: "delivery_plan",
          crop_name: order.crop_name ?? "fresh produce",
          quantity: order.quantity,
          freshness_hours: freshnessHours,
          distance_km: distanceKm,
        }),
      });
      const plan = await response.json();
      if (!response.ok) throw new Error(plan.error || t("ai_plan_failed"));
      setPickup(toLocalInput(plan.pickup));
      setDelivery(toLocalInput(plan.delivery));
      setFee(String(plan.fee));
      toast.success(t("ai_plan_ready"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ai_plan_failed"));
    } finally {
      setAiBusy(false);
    }
  };

  const handleSave = () => {
    if (disabled) { toast.error(t("err_schedule_status")); return; }
    if (!pickup || !delivery || !fee) return;
    const pickupTs = new Date(pickup).getTime();
    const deliveryTs = new Date(delivery).getTime();
    if (pickupTs <= Date.now()) { toast.error(t("err_schedule_past")); return; }
    if (deliveryTs <= pickupTs) { toast.error(t("err_delivery_before_pickup")); return; }
    const freshnessMs = freshnessHours * 3600 * 1000;
    if (deliveryTs - pickupTs > freshnessMs) { toast.error(t("err_delivery_beyond_freshness")); return; }
    const feeNum = Number(fee);
    if (!Number.isFinite(feeNum) || feeNum <= 0) return;
    onRequestSave(pickup, delivery, feeNum);
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">{t("plan_trip")}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> {t("freshness_window")}: {freshnessHours}{t("hours_short")}
          {distanceKm != null && <> · {t("distance_km")}: {distanceKm.toFixed(1)}</>}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("pickup")}</span>
          <Input type="datetime-local" value={pickup} min={min} disabled={disabled}
            onChange={(e) => setPickup(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("delivery_time")}</span>
          <Input type="datetime-local" value={delivery} min={pickup || min} disabled={disabled}
            onChange={(e) => setDelivery(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 space-y-1 text-xs">
          <span className="text-muted-foreground">{t("delivery_fee")}</span>
          <Input type="number" min={0} step={5} value={fee} disabled={disabled}
            onChange={(e) => setFee(e.target.value)} placeholder="₹" />
        </label>
        <Button type="button" size="sm" variant="outline" onClick={handleSuggestFee} disabled={disabled}>
          <Sparkles className="mr-1 h-3.5 w-3.5" /> {t("suggest_fee")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleAiPlan} disabled={disabled || aiBusy}>
          <Sparkles className="mr-1 h-3.5 w-3.5" /> {aiBusy ? t("ai_thinking") : t("ai_plan_trip")}
        </Button>
        <Button type="button" size="sm" onClick={handleSave}
          disabled={disabled || !pickup || !delivery || !fee}>
          {t("save_plan")}
        </Button>
      </div>
    </div>
  );
}

function AiSlotPicker({ order, onSaved, t }: {
  order: Order;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const [slots, setSlots] = useState<Array<{ label: string; start_iso: string }>>([]);
  const [busy, setBusy] = useState(false);

  const distanceKm = useMemo(() => {
    if (order.pickup_lat != null && order.pickup_lng != null && order.delivery_lat != null && order.delivery_lng != null) {
      return haversineKm(
        { lat: order.pickup_lat, lng: order.pickup_lng },
        { lat: order.delivery_lat, lng: order.delivery_lng },
      );
    }
    return null;
  }, [order]);

  const fetchSlots = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/crop-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({
          action: "time_windows",
          pickup_address: order.pickup_address,
          drop_address: order.delivery_address,
          distance_km: distanceKm,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.slots?.length) throw new Error(json.error || t("ai_slots_failed"));
      setSlots(json.slots);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ai_slots_failed"));
    } finally {
      setBusy(false);
    }
  };

  const chooseSlot = async (iso: string) => {
    const { error } = await supabase.from("orders")
      .update({ scheduled_delivery_at: new Date(iso).toISOString() })
      .eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("slot_saved"));
    setSlots([]);
    onSaved();
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <Button type="button" size="sm" variant="outline" onClick={fetchSlots} disabled={busy}>
        <Sparkles className="mr-1 h-3.5 w-3.5" /> {busy ? t("ai_thinking") : t("schedule_with_ai")}
      </Button>
      {slots.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("ai_slots_title")}</div>
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Button key={s.start_iso} type="button" size="sm" onClick={() => chooseSlot(s.start_iso)}>
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryDash() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [available, setAvailable] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);
  const [pending, setPending] = useState<{ order: Order; pickup: string; delivery: string; fee: number } | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: a, error: availableError }, { data: m, error: mineError }] = await Promise.all([
      (supabase.from as unknown as (name: string) => ReturnType<typeof supabase.from>)("available_delivery_jobs")
        .select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*, crop_listings(freshness_hours, harvest_date, crop_name)")
        .eq("delivery_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (availableError) toast.error(`${t("available_jobs")}: ${availableError.message}`);
    if (mineError) toast.error(`${t("my_jobs")}: ${mineError.message}`);
    setAvailable(((a as unknown as Order[]) ?? []).map((o) => ({ ...o, buyer_phone: null, farmer_phone: null })));
    setMine(((m as unknown as (Order & { crop_listings?: { freshness_hours: number; harvest_date: string | null; crop_name: string } | null })[]) ?? []).map((o) => ({
      ...o,
      freshness_hours: o.crop_listings?.freshness_hours ?? 48,
      harvest_date: o.crop_listings?.harvest_date ?? null,
      crop_name: o.crop_listings?.crop_name ?? null,
    })));
  };
  useEffect(() => { load(); }, [user]);

  const takeJob = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("orders").update({
      delivery_id: user.id,
      status: "accepted",
    }).eq("id", id).is("delivery_id", null).eq("status", "pending");
    if (error) { toast.error(error.message); return; }

    const { data: claimed, error: verifyError } = await supabase.from("orders")
      .select("id")
      .eq("id", id)
      .eq("delivery_id", user.id)
      .maybeSingle();
    if (verifyError) { toast.error(verifyError.message); return; }
    if (!claimed) { toast.error(t("job_already_taken")); await load(); return; }

    toast.success(t("job_accepted"));
    await load();
  };
  const advance = async (id: string, to: "picked_up" | "delivered") => {
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t(to)); load(); }
  };

  const confirmPlan = async () => {
    if (!pending) return;
    const { order, pickup, delivery, fee } = pending;
    const { data: fresh } = await supabase.from("orders").select("status").eq("id", order.id).maybeSingle();
    if (!fresh || !SCHEDULABLE_STATUSES.has(fresh.status)) {
      toast.error(t("err_schedule_status")); setPending(null); load(); return;
    }
    const { error } = await supabase.from("orders").update({
      scheduled_pickup_at: new Date(pickup).toISOString(),
      scheduled_delivery_at: new Date(delivery).toISOString(),
      delivery_fee: fee,
    }).eq("id", order.id);
    if (error) toast.error(error.message);
    else { toast.success(t("save_plan")); load(); }
    setPending(null);
  };

  const renderOrder = (o: Order, mineJob: boolean) => (
    <Card key={o.id} className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">
            {o.crop_name ? `${o.crop_name} · ` : ""}₹{o.total_price} · {o.quantity} units
          </div>
          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
          {o.scheduled_pickup_at && (
            <div className="text-xs font-medium text-primary">
              {t("pickup")}: {new Date(o.scheduled_pickup_at).toLocaleString()}
            </div>
          )}
          {o.scheduled_delivery_at && (
            <div className="text-xs font-medium text-primary">
              {t("delivery_time")}: {new Date(o.scheduled_delivery_at).toLocaleString()}
            </div>
          )}
          {o.delivery_fee != null && (
            <div className="text-xs font-medium">{t("delivery_fee")}: ₹{o.delivery_fee}</div>
          )}
        </div>
        <Badge>{t(o.status)}</Badge>
      </div>

      <ContactRow label={t("pickup_location") + " · " + t("farmer_contact")}
        phone={mineJob ? o.farmer_phone : null} address={o.pickup_address}
        lat={o.pickup_lat} lng={o.pickup_lng} t={t} />
      <ContactRow label={t("delivery_address") + " · " + t("buyer_contact")}
        phone={mineJob ? o.buyer_phone : null} address={o.delivery_address}
        lat={o.delivery_lat} lng={o.delivery_lng} t={t} />

      {mineJob && SCHEDULABLE_STATUSES.has(o.status) && (
        <TripPlanner order={o} t={t}
          onRequestSave={(pickup, delivery, fee) => setPending({ order: o, pickup, delivery, fee })} />
      )}

      {mineJob && SCHEDULABLE_STATUSES.has(o.status) && (
        <AiSlotPicker order={o} t={t} onSaved={load} />
      )}

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
          <div className="grid gap-3 md:grid-cols-2">{available.map((o) => renderOrder(o, false))}</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("my_jobs")}</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_orders")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{mine.map((o) => renderOrder(o, true))}</div>
        )}
      </section>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_plan_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_plan_desc")}
              {pending && (
                <span className="mt-2 block space-y-0.5 font-medium text-foreground">
                  <span className="block">{t("pickup")}: {new Date(pending.pickup).toLocaleString()}</span>
                  <span className="block">{t("delivery_time")}: {new Date(pending.delivery).toLocaleString()}</span>
                  <span className="block">{t("delivery_fee")}: ₹{pending.fee}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPlan}>{t("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
