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

export type TaskComplexity = "simple" | "standard" | "heavy";
export type TaskUrgency = "flexible" | "standard" | "urgent";

export interface PricingInput {
  distanceKm: number;
  category?: string;
  complexity?: TaskComplexity;
  urgency?: TaskUrgency;
  stopCount?: number;
}

export interface PricingEstimate {
  customerTotal: number;
  runnerEarning: number;
  commissionAmount: number;
  commissionRate: number;
  estimatedMinutes: number;
  fairRangeMin: number;
  fairRangeMax: number;
  breakdown: {
    base: number;
    distance: number;
    time: number;
    complexity: number;
    stops: number;
    urgency: number;
  };
}

const CATEGORY_BASE: Record<string, number> = {
  groceries: 950,
  delivery: 850,
  home_help: 1_300,
  errand: 800,
  temporary_job: 1_500,
  service_request: 1_250,
};

const CATEGORY_TASK_MINUTES: Record<string, number> = {
  groceries: 35,
  delivery: 18,
  home_help: 60,
  errand: 25,
  temporary_job: 120,
  service_request: 60,
};

const COMPLEXITY_FEE: Record<TaskComplexity, number> = {
  simple: 0,
  standard: 350,
  heavy: 950,
};

const URGENCY_MULTIPLIER: Record<TaskUrgency, number> = {
  flexible: 0.9,
  standard: 1,
  urgent: 1.2,
};

export const TWINKLEGO_COMMISSION_RATE = 0.125;

/**
 * Fair-price model for local Nigerian errands. Distance is tiered so long routes
 * do not balloon, while time, task effort, stops, and urgency remain visible.
 */
export function estimateTaskPrice(input: PricingInput): PricingEstimate {
  const distanceKm = Number.isFinite(input.distanceKm) ? Math.max(0, input.distanceKm) : 0;
  const category = input.category && CATEGORY_BASE[input.category] ? input.category : "errand";
  const complexity = input.complexity && COMPLEXITY_FEE[input.complexity] !== undefined ? input.complexity : "standard";
  const urgency = input.urgency && URGENCY_MULTIPLIER[input.urgency] ? input.urgency : "standard";
  const stopCount = Number.isFinite(input.stopCount) ? Math.min(Math.max(Math.round(input.stopCount ?? 0), 0), 5) : 0;

  const firstThreeKm = Math.min(distanceKm, 3) * 150;
  const nextSevenKm = Math.min(Math.max(distanceKm - 3, 0), 7) * 120;
  const remainingKm = Math.max(distanceKm - 10, 0) * 90;
  const distanceFee = firstThreeKm + nextSevenKm + remainingKm;

  const travelMinutes = distanceKm > 0 ? Math.ceil((distanceKm / 22) * 60 * 1.2) : 0;
  const estimatedMinutes = travelMinutes + CATEGORY_TASK_MINUTES[category] + stopCount * 10;
  const timeFee = estimatedMinutes * 8;
  const base = CATEGORY_BASE[category];
  const complexityFee = COMPLEXITY_FEE[complexity];
  const stopsFee = stopCount * 350;
  const subtotal = base + distanceFee + timeFee + complexityFee + stopsFee;
  const urgencyAdjustment = subtotal * (URGENCY_MULTIPLIER[urgency] - 1);
  const customerTotal = roundToNearest50(Math.max(1_000, subtotal + urgencyAdjustment));
  const commissionAmount = roundToNearest50(customerTotal * TWINKLEGO_COMMISSION_RATE);
  const runnerEarning = customerTotal - commissionAmount;

  return {
    customerTotal,
    runnerEarning,
    commissionAmount,
    commissionRate: TWINKLEGO_COMMISSION_RATE,
    estimatedMinutes,
    fairRangeMin: roundToNearest50(customerTotal * 0.9),
    fairRangeMax: roundToNearest50(customerTotal * 1.1),
    breakdown: {
      base,
      distance: roundToNearest50(distanceFee),
      time: roundToNearest50(timeFee),
      complexity: complexityFee,
      stops: stopsFee,
      urgency: roundToNearest50(urgencyAdjustment),
    },
  };
}

export function estimatePrice(distanceKm: number): number {
  return estimateTaskPrice({ distanceKm }).customerTotal;
}

function roundToNearest50(amount: number) {
  return Math.round(amount / 50) * 50;
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
