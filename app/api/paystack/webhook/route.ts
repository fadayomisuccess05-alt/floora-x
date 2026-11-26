import { validSignature } from "@/lib/paystack";
import { settlePayment } from "@/lib/points/settle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (event.event === "charge.success" && typeof event.data?.reference === "string") {
    await settlePayment(event.data.reference);
  }
  return new Response("ok");
}