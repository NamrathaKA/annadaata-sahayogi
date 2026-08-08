import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/farmer")({
  component: FarmerDash,
});

interface Listing {
  id: string;
  crop_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  location: string;
  status: string;
  created_at: string;
}
interface Order {
  id: string;
  listing_id: string;
  quantity: number;
  total_price: number;
  status: string;
  delivery_address: string;
  buyer_phone: string | null;
  scheduled_pickup_at: string | null;
  scheduled_delivery_at: string | null;
  delivery_fee: number | null;
  delivery_fee_farmer_share: number | null;
  distance_km: number | null;
  created_at: string;
}

function FarmerDash() {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: l }, { data: o }] = await Promise.all([
      supabase.from("crop_listings").select("*").eq("farmer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("farmer_id", user.id).order("created_at", { ascending: false }),
    ]);
    setListings((l as Listing[]) ?? []);
    setOrders((o as Order[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("farmer_intro")}</p>
      </div>

      <SeasonalCropsPanel lang={lang} location={profile?.location ?? ""} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("my_listings")}</h2>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t("add_listing")}
          </Button>
        </div>
        {showAdd && (
          <AddListing
            farmerId={user!.id}
            defaultLocation={profile?.location ?? ""}
            lang={lang}
            onDone={() => { setShowAdd(false); load(); }}
          />
        )}
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_listings")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {listings.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{l.crop_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {l.quantity} {l.unit} · ₹{l.price_per_unit}/{l.unit} · {l.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{l.status}</Badge>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this listing?")) return;
                        const { error } = await supabase.from("crop_listings").delete().eq("id", l.id);
                        if (error) {
                          const { error: upErr } = await supabase.from("crop_listings").update({ status: "expired" }).eq("id", l.id);
                          if (upErr) toast.error(upErr.message);
                          else toast.success("Listing removed");
                        } else {
                          toast.success("Deleted");
                        }
                        load();
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("my_orders")}</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_orders")}</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{o.quantity} units · ₹{o.total_price}</div>
                    <div className="text-xs text-muted-foreground">{o.delivery_address} · {o.buyer_phone ?? ""}</div>
                    {(o.scheduled_pickup_at || o.scheduled_delivery_at) && (
                      <div className="mt-2 space-y-0.5 border-l-2 border-primary pl-2 text-xs">
                        {o.scheduled_pickup_at && <div>{t("pickup")}: {new Date(o.scheduled_pickup_at).toLocaleString()}</div>}
                        {o.scheduled_delivery_at && <div>{t("delivery_time")}: {new Date(o.scheduled_delivery_at).toLocaleString()}</div>}
                        {o.delivery_fee != null && <div>{t("delivery_fee")}: ₹{o.delivery_fee}</div>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{t(o.status)}</Badge>
                    {o.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await supabase.from("orders").update({ status: "accepted" }).eq("id", o.id);
                          toast.success("Accepted");
                          load();
                        }}
                      >
                        {t("accept")}
                      </Button>
                    )}
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

function AddListing({ farmerId, defaultLocation, lang, onDone }: { farmerId: string; defaultLocation: string; lang: string; onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    crop_name: "", quantity: "10", unit: "kg", price_per_unit: "20",
    harvest_date: "", description: "",
  });
  const [loc, setLoc] = useState<LocationValue>({ address: defaultLocation, lat: null, lng: null });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPrice, setAiPrice] = useState<{ min: number; max: number; suggested: number; note: string } | null>(null);

  const suggestPrice = async () => {
    if (!f.crop_name.trim()) { toast.error(t("crop_name")); return; }
    setAiBusy(true); setAiPrice(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/crop-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ action: "price", crop_name: f.crop_name, unit: f.unit, location: loc.address || defaultLocation, language: lang }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "AI failed");
      setAiPrice(j);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("crop_listings").insert({
      farmer_id: farmerId,
      crop_name: f.crop_name,
      quantity: Number(f.quantity),
      unit: f.unit,
      price_per_unit: Number(f.price_per_unit),
      location: loc.address,
      pickup_lat: loc.lat,
      pickup_lng: loc.lng,
      harvest_date: f.harvest_date || null,
      description: f.description || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Listed!"); onDone(); }
  };
  return (
    <Card className="mb-4 p-4">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>{t("crop_name")}</Label>
          <div className="flex gap-2">
            <Input required value={f.crop_name} onChange={(e) => setF({ ...f, crop_name: e.target.value })} className="flex-1" />
            <VoiceInput field="text" onValue={(v) => setF({ ...f, crop_name: v })} />
          </div>
        </div>
        <div><Label>{t("quantity")}</Label>
          <div className="flex gap-2">
            <Input type="number" min="1" required value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className="flex-1" />
            <VoiceInput field="number" onValue={(v) => setF({ ...f, quantity: v })} />
          </div>
        </div>
        <div><Label>{t("unit")}</Label>
          <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="kg">kg</option><option value="quintal">quintal</option><option value="ton">ton</option><option value="pieces">pieces</option>
          </select>
        </div>
        <div>
          <Label>{t("price_per_unit")}</Label>
          <div className="flex gap-2">
            <Input type="number" min="0" step="0.01" required value={f.price_per_unit} onChange={(e) => setF({ ...f, price_per_unit: e.target.value })} className="flex-1" />
            <VoiceInput field="number" onValue={(v) => setF({ ...f, price_per_unit: v })} />
          </div>
          <div className="mt-2">
            <Button type="button" size="sm" variant="secondary" onClick={suggestPrice} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
              {aiBusy ? t("ai_thinking") : t("ai_suggest_price")}
            </Button>
            {aiPrice && (
              <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
                <div className="font-medium">
                  ₹{aiPrice.min}–₹{aiPrice.max} / {f.unit} · <span className="text-primary">₹{aiPrice.suggested}</span>
                </div>
                {aiPrice.note && <div className="mt-0.5 text-muted-foreground">{aiPrice.note}</div>}
                <Button type="button" size="sm" variant="link" className="h-auto p-0 text-xs"
                  onClick={() => setF({ ...f, price_per_unit: String(aiPrice.suggested) })}>
                  {t("ai_use_price")}
                </Button>
              </div>
            )}
          </div>
        </div>
        <div><Label>{t("harvest_date")}</Label><Input type="date" value={f.harvest_date} onChange={(e) => setF({ ...f, harvest_date: e.target.value })} /></div>
        <div className="md:col-span-2">
          <LocationPicker label={t("pickup_location")} value={loc} onChange={setLoc} />
        </div>
        <div className="md:col-span-2">
          <Label>{t("description")}</Label>
          <div className="flex gap-2">
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="flex-1" />
            <VoiceInput field="text" onValue={(v) => setF({ ...f, description: v })} />
          </div>
        </div>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>{t("save")}</Button>
          <Button type="button" variant="outline" onClick={onDone}>{t("cancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

function SeasonalCropsPanel({ lang, location }: { lang: string; location: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [crops, setCrops] = useState<Array<{ name: string; reason: string; price_range_inr_per_kg: string }> | null>(null);

  const load = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/crop-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ action: "seasonal", location, language: lang }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "AI failed");
      setCrops(j.crops ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> {t("ai_seasonal_title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("ai_seasonal_hint")}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
          {busy ? t("ai_thinking") : t("ai_load_seasonal")}
        </Button>
      </div>
      {crops && crops.length > 0 && (
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {crops.map((c, i) => (
            <li key={i} className="rounded-md border bg-muted/30 p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-primary">{c.price_range_inr_per_kg}</span>
              </div>
              <div className="text-xs text-muted-foreground">{c.reason}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

