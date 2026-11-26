import "server-only";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import { creditInTx } from "@/lib/points/wallet";

export type SettleResult = "credited" | "already" | "failed" | "pending" | "unknown";

// Asks Paystack whether the payment really succeeded, then credits points once.
export async function settlePayment(reference: string): Promise<SettleResult> {
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment) return "unknown";
  if (payment.status === "SUCCESSFUL") return "already";

  let data;
  try {
    data = await verifyTransaction(reference);
  } catch (e) {
    console.error("Paystack verify failed:", e instanceof Error ? e.message : e);
    return "pending";
  }

  if (data.status === "failed") {
    await db.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "FAILED" } });
    return "failed";
  }
  if (data.status !== "success") return "pending";

  // Never trust a payment whose amount or currency doesn't match what we asked for
  if (data.currency !== "NGN" || data.amount !== payment.amountNaira * 100) {
    console.error("Paystack amount mismatch for", reference);
    await db.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "FAILED" } });
    return "failed";
  }

  const credited = await db.$transaction(async (tx) => {
    const res = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESSFUL" } }, // only the first caller wins
      data: { status: "SUCCESSFUL", paidAt: new Date(), providerReference: data.id ? String(data.id) : null },
    });
    if (res.count === 0) return false;
    await creditInTx(tx, {
      userId: payment.userId,
      points: payment.points,
      bonus: payment.bonusPoints,
      paymentId: payment.id,
      idemKey: `topup:${payment.id}`,
    });
    await tx.auditLog.create({
      data: {
        actorId: payment.userId,
        action: "POINTS_PURCHASED",
        entityType: "Payment",
        entityId: payment.id,
        newValues: { points: payment.points, bonus: payment.bonusPoints, amountNaira: payment.amountNaira },
      },
    });
    return true;
  });

  return credited ? "credited" : "already";
}