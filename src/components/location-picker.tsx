// Location picker: uses the browser's GPS to auto-fill an address + lat/lng,
// and offers a text fallback for manual entry. Reverse-geocode uses OpenStreetMap
// Nominatim (no API key). Coordinates are optional but strongly recommended.
import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { VoiceInput } from "@/components/voice-input";

export interface LocationValue {
  address: string;
  lat: number | null;
  lng: number | null;
}

export function LocationPicker({
  value, onChange, label, multiline = false,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  label?: string;
  multiline?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const useGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error(t("gps_unavailable"));
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { "Accept-Language": "en" } },
          );
          const j = (await res.json()) as { display_name?: string };
          onChange({ address: j.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
        } catch {
          onChange({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        console.error(err);
        toast.error(t("gps_denied"));
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-start gap-2">
        {multiline ? (
          <Textarea
            required
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder={t("address_placeholder")}
            className="flex-1"
          />
        ) : (
          <Input
            required
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder={t("address_placeholder")}
            className="flex-1"
          />
        )}
        <VoiceInput field="address" onValue={(v) => onChange({ ...value, address: v })} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={useGps} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MapPin className="mr-1 h-4 w-4" />}
          {t("use_my_location")}
        </Button>
        {value.lat != null && value.lng != null && (
          <span className="text-xs text-muted-foreground">
            📍 {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
