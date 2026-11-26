import { db } from "@/lib/db";
import { refundInTx } from "@/lib/points/wallet";

export const dynamic = "force-dynamic";

// Runs once a day. Refunds an enquiry charge when the owner never replied within 48 hours.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const entries = await db.creditLedgerEntry.findMany({
    where: {
      reason: "SPEND",
      action: "SEND_ENQUIRY",
      refType: "Conversation",
      createdAt: { lt: new Date(now - 48 * 3600 * 1000), gt: new Date(now - 14 * 24 * 3600 * 1000) },
    },
    take: 200,
  });

  let refunded = 0;
  for (const e of entries) {
    if (!e.refId) continue;
    const c = await db.conversation.findUnique({ where: { id: e.refId }, select: { status: true } });
    if (!c || (c.status !== "NEW" && c.status !== "READ")) continue; // the owner replied
    if (await db.$transaction((tx) => refundInTx(tx, e.id))) refunded++;
  }
  return Response.json({ refunded });
}