import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { isEnabled } from "@/lib/flags";

type Tx = Prisma.TransactionClient;

export class InsufficientPointsError extends Error {
  constructor(
    public cost: number,
    public balance: number
  ) {
    super("INSUFFICIENT_POINTS");
  }
}

// What an action costs right now. Zero while the points system is switched off.
export async function getActionCost(action: string): Promise<number> {
  if (!(await isEnabled("credits_enabled"))) return 0;
  const row = await db.actionPrice.findUnique({ where: { action } });
  return row && row.active && row.points > 0 ? row.points : 0;
}

export async function getBalance(userId: string): Promise<number> {
  const w = await db.wallet.findUnique({
    where: { userId_type: { userId, type: "CLIENT_POINTS" } },
    select: { balance: true },
  });
  return w?.balance ?? 0;
}

async function ensureWallet(tx: Tx, userId: string) {
  return tx.wallet.upsert({
    where: { userId_type: { userId, type: "CLIENT_POINTS" } },
    create: { userId, type: "CLIENT_POINTS" },
    update: {},
  });
}

// Charge points inside a database transaction. Throws InsufficientPointsError
// (which rolls the whole transaction back) when the balance is too low.
export async function spendInTx(
  tx: Tx,
  p: { userId: string; action: string; cost: number; refType: string; refId: string; idemKey: string }
) {
  if (p.cost <= 0) return { charged: 0 };

  const dup = await tx.creditLedgerEntry.findUnique({ where: { idemKey: p.idemKey } });
  if (dup) return { charged: -dup.amount };

  const wallet = await ensureWallet(tx, p.userId);
  const updated = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: p.cost } },
    data: { balance: { decrement: p.cost } },
  });
  if (updated.count === 0) {
    const now = await tx.wallet.findUnique({ where: { id: wallet.id } });
    throw new InsufficientPointsError(p.cost, now?.balance ?? 0);
  }

  const after = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await tx.creditLedgerEntry.create({
    data: {
      walletId: wallet.id,
      amount: -p.cost,
      balanceAfter: after.balance,
      reason: "SPEND",
      action: p.action,
      refType: p.refType,
      refId: p.refId,
      idemKey: p.idemKey,
    },
  });
  return { charged: p.cost };
}

// Add purchased points (and any bonus). Safe to call twice: the idempotency key stops double credit.
export async function creditInTx(
  tx: Tx,
  p: { userId: string; points: number; bonus: number; paymentId: string; idemKey: string }
) {
  if (await tx.creditLedgerEntry.findUnique({ where: { idemKey: p.idemKey } })) return;

  const wallet = await ensureWallet(tx, p.userId);
  let w = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: p.points } } });
  await tx.creditLedgerEntry.create({
    data: {
      walletId: wallet.id,
      amount: p.points,
      balanceAfter: w.balance,
      reason: "TOPUP",
      refType: "Payment",
      refId: p.paymentId,
      paymentId: p.paymentId,
      idemKey: p.idemKey,
    },
  });

  if (p.bonus > 0) {
    w = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: p.bonus } } });
    await tx.creditLedgerEntry.create({
      data: {
        walletId: wallet.id,
        amount: p.bonus,
        balanceAfter: w.balance,
        reason: "BONUS",
        refType: "Payment",
        refId: p.paymentId,
        paymentId: p.paymentId,
        idemKey: `${p.idemKey}:bonus`,
      },
    });
  }
}

// Give back a charge. Returns false if it was already refunded.
export async function refundInTx(tx: Tx, entryId: string): Promise<boolean> {
  const entry = await tx.creditLedgerEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.amount >= 0) return false;

  const idemKey = `refund:${entry.id}`;
  if (await tx.creditLedgerEntry.findUnique({ where: { idemKey } })) return false;

  const w = await tx.wallet.update({
    where: { id: entry.walletId },
    data: { balance: { increment: -entry.amount } },
  });
  await tx.creditLedgerEntry.create({
    data: {
      walletId: entry.walletId,
      amount: -entry.amount,
      balanceAfter: w.balance,
      reason: "REFUND",
      action: entry.action,
      refType: entry.refType,
      refId: entry.refId,
      idemKey,
    },
  });
  return true;
}