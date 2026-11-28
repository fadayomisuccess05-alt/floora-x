import { db } from "@/lib/db";
import { refundInTx } from "@/lib/points/wallet";

export const dynamic = "force-dynamic";

// Runs once a day. Refunds a charge when the owner never answered within 48 hours.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const window = { lt: new Date(now - 48 * 3600 * 1000), gt: new Date(now - 14 * 24 * 3600 * 1000) };

  // Enquiries nobody replied to
  const enquiries = await db.creditLedgerEntry.findMany({
    where: { reason: "SPEND", action: "SEND_ENQUIRY", refType: "Conversation", createdAt: window },
    take: 200,
  });
  let refundedEnquiries = 0;
  for (const e of enquiries) {
    if (!e.refId) continue;
    const c = await db.conversation.findUnique({ where: { id: e.refId }, select: { status: true } });
    if (!c || (c.status !== "NEW" && c.status !== "READ")) continue; // the owner replied
    if (await db.$transaction((tx) => refundInTx(tx, e.id))) refundedEnquiries++;
  }

  // Inspection requests the owner never answered
  const inspections = await db.creditLedgerEntry.findMany({
    where: { reason: "SPEND", action: "REQUEST_INSPECTION", refType: "Inspection", createdAt: window },
    take: 200,
  });
  let refundedInspections = 0;
  for (const e of inspections) {
    if (!e.refId) continue;
    const i = await db.inspection.findUnique({
      where: { id: e.refId },
      select: { status: true, proposedById: true, clientId: true },
    });
    // Still waiting on the owner: untouched, and the last proposal is still the client's
    if (!i || i.status !== "PENDING" || i.proposedById !== i.clientId) continue;
    if (await db.$transaction((tx) => refundInTx(tx, e.id))) refundedInspections++;
  }

  return Response.json({ refundedEnquiries, refundedInspections });
}