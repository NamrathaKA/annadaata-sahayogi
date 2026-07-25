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
  created_at: string;
}

function FarmerDash() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
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

function AddListing({ farmerId, defaultLocation, onDone }: { farmerId: string; defaultLocation: string; onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    crop_name: "", quantity: "10", unit: "kg", price_per_unit: "20",
    harvest_date: "", description: "",
  });
  const [loc, setLoc] = useState<LocationValue>({ address: defaultLocation, lat: null, lng: null });
  const [busy, setBusy] = useState(false);
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
        <div><Label>{t("price_per_unit")}</Label>
          <div className="flex gap-2">
            <Input type="number" min="0" step="0.01" required value={f.price_per_unit} onChange={(e) => setF({ ...f, price_per_unit: e.target.value })} className="flex-1" />
            <VoiceInput field="number" onValue={(v) => setF({ ...f, price_per_unit: v })} />
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
