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
import { VoiceInput } from "@/components/voice-input";
import { LocationPicker, type LocationValue } from "@/components/location-picker";

export const Route = createFileRoute("/app/buyer")({
  component: BuyerDash,
});

interface Listing {
  id: string; farmer_id: string; crop_name: string; quantity: number; unit: string;
  price_per_unit: number; location: string; description: string | null;
}
interface Order {
  id: string; quantity: number; total_price: number; status: string; delivery_address: string; created_at: string;
}

function BuyerDash() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordering, setOrdering] = useState<Listing | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: l }, { data: o }] = await Promise.all([
      supabase.from("crop_listings").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("buyer_id", user.id).order("created_at", { ascending: false }),
    ]);
    setListings((l as Listing[]) ?? []);
    setOrders((o as Order[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const q = search.trim().toLowerCase();
  const filteredListings = q
    ? listings.filter((l) =>
        l.crop_name.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q),
      )
    : listings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("buyer_intro")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("browse_crops")}</h2>
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
                      {l.quantity} {l.unit} available · {l.location}
                    </p>
                    <p className="mt-1 text-primary font-medium">₹{l.price_per_unit}/{l.unit}</p>
                    {l.description && <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>}
                  </div>
                  <Button size="sm" onClick={() => setOrdering(l)}>{t("order_now")}</Button>
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
              <Card key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{o.quantity} · ₹{o.total_price}</div>
                  <div className="text-xs text-muted-foreground">{o.delivery_address}</div>
                </div>
                <Badge>{t(o.status)}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>

      {ordering && user && (
        <OrderDialog
          listing={ordering}
          buyerId={user.id}
          defaultAddress={profile?.location ?? ""}
          defaultPhone={profile?.phone ?? ""}
          onClose={() => setOrdering(null)}
          onDone={() => { setOrdering(null); load(); }}
        />
      )}
    </div>
  );
}

function OrderDialog({ listing, buyerId, defaultAddress, defaultPhone, onClose, onDone }: {
  listing: Listing; buyerId: string; defaultAddress: string; defaultPhone: string;
  onClose: () => void; onDone: () => void;
}) {
  const { t } = useI18n();
  const [qty, setQty] = useState("1");
  const [loc, setLoc] = useState<LocationValue>({ address: defaultAddress, lat: null, lng: null });
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const total = Math.max(0, Number(qty)) * listing.price_per_unit;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("orders").insert({
      listing_id: listing.id,
      buyer_id: buyerId,
      farmer_id: listing.farmer_id,
      quantity: Number(qty),
      total_price: total,
      delivery_address: loc.address,
      delivery_lat: loc.lat,
      delivery_lng: loc.lng,
      buyer_phone: phone,
      notes: notes || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Order placed"); onDone(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <Card className="my-8 w-full max-w-md p-6">
        <h3 className="mb-1 font-semibold">{listing.crop_name}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          ₹{listing.price_per_unit}/{listing.unit} · {listing.quantity} available
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>{t("quantity")} ({listing.unit})</Label>
            <div className="flex gap-2">
              <Input type="number" min="1" max={listing.quantity} required value={qty} onChange={(e) => setQty(e.target.value)} className="flex-1" />
              <VoiceInput field="number" onValue={setQty} />
            </div>
          </div>
          <LocationPicker label={t("delivery_address")} value={loc} onChange={setLoc} multiline />
          <div>
            <Label>{t("phone")}</Label>
            <div className="flex gap-2">
              <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
              <VoiceInput field="phone" onValue={setPhone} />
            </div>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm font-medium">{t("total")}: ₹{total.toFixed(2)}</div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || total <= 0} className="flex-1">{t("place_order")}</Button>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
