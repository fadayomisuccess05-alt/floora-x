import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://api.paystack.co";

function secret() {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return k;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) throw new Error(json?.message ?? "Paystack could not start the payment.");
  return json.data as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) throw new Error(json?.message ?? "Paystack could not verify the payment.");
  return json.data as { id?: number; status: string; amount: number; currency: string; reference: string };
}

export function validSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}