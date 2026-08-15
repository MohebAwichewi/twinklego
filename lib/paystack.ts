import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_API = "https://api.paystack.co";

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}
export class PaystackError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
  }
}

export function isPaystackConfigured() {
  return /^sk_(test|live)_/.test(process.env.PAYSTACK_SECRET_KEY?.trim() ?? "");
}

export function paystackMode() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  return key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unconfigured";
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured?.startsWith("https://")) return configured;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://twinkle-go.vercel.app";
}

export async function paystackRequest<T>(path: string, init?: RequestInit) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !isPaystackConfigured()) {
    throw new PaystackError("Secure payments are not configured yet.", 503);
  }

  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await response.json().catch(() => null) as PaystackEnvelope<T> | null;
  if (!response.ok || !payload?.status) {
    throw new PaystackError(payload?.message || "The payment provider could not complete this request.", response.status || 502);
  }

  return payload.data;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !signature) return false;

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
