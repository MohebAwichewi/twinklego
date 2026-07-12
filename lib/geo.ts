/**
 * Calculate distance in km between two lat/lng points using the Haversine formula
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimate price based on distance (base fee + per-km rate)
 * Returns price in NGN (Naira)
 */
export function estimatePrice(distanceKm: number): number {
  const BASE_FEE = 500;
  const PER_KM = 200;
  return Math.round(BASE_FEE + distanceKm * PER_KM);
}

/**
 * Estimate ETA in minutes from distance. Uses a conservative city speed so the UI
 * gives reassurance without pretending to know exact traffic conditions.
 */
export function estimateEtaMinutes(distanceKm: number, speedKmh = 22): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 1;
  const trafficBuffer = 1.2;
  return Math.max(1, Math.ceil((distanceKm / speedKmh) * 60 * trafficBuffer));
}

/**
 * Format NGN currency
 */
export function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
