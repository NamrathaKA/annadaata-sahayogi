// Fair, transparent delivery pricing shared by farmer, buyer and delivery partner.
// Cost-based (no markup): small base to cover the partner's fixed effort + per-km fuel
// + a tiny per-unit handling charge. Total is split 20% farmer / 80% buyer.

export const FARMER_SHARE_PCT = 20;
export const BUYER_SHARE_PCT = 80;

const BASE_FEE = 20; // fixed trip effort
const PER_KM = 7; // fuel + wear
const PER_UNIT = 0.5; // loading/handling
const MIN_FEE = 25;
const FALLBACK_KM = 5;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface FeeBreakdown {
  total: number;
  farmerShare: number;
  buyerShare: number;
  km: number | null;
}

export function computeDeliveryFee(km: number | null, quantity: number): FeeBreakdown {
  const raw = BASE_FEE + (km ?? FALLBACK_KM) * PER_KM + Math.max(0, quantity) * PER_UNIT;
  const total = Math.max(MIN_FEE, Math.round(raw));
  const farmerShare = Math.round((total * FARMER_SHARE_PCT) / 100);
  return { total, farmerShare, buyerShare: total - farmerShare, km };
}
