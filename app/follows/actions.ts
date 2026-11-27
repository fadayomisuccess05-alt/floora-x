"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { InsufficientPointsError, getActionCost, spendInTx } from "@/lib/points/wallet";

type Result =
  | { ok: true; following: boolean }
  | { ok: false; error: string; needsLogin?: boolean; code?: string };
const fail = (error: string, needsLogin = false): Result => ({ ok: false, error, needsLogin });

export async function toggleFollow(targetType: string, targetId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in to follow.", true);
  if (user.accountType === "ADMIN") return fail("Administrator accounts can't follow.");
  if (targetType !== "AGENT" && targetType !== "AGENCY") return fail("Invalid request.");

  if (targetType === "AGENT") {
    const t = await db.user.findFirst({ where: { id: targetId, accountType: "AGENT", accountStatus: "ACTIVE" }, select: { id: true } });
    if (!t) return fail("This agent could not be found.");
    if (t.id === user.id) return fail("You can't follow yourself.");
  } else {
    const a = await db.agency.findUnique({ where: { id: targetId }, select: { ownerUserId: true } });
    if (!a) return fail("This agency could not be found.");
    if (a.ownerUserId === user.id) return fail("You can't follow your own agency.");
  }

  const key = { followerId: user.id, targetType, targetId };
  const existing = await db.follow.findUnique({ where: { followerId_targetType_targetId: key } });
  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
    revalidatePath("/dashboard/following");
    return { ok: true, following: false };
  }

  const total = await db.follow.count({ where: { followerId: user.id } });
  if (total >= 200) return fail("You are following the maximum number of accounts.");

  const action = targetType === "AGENT" ? "FOLLOW_AGENT" : "FOLLOW_AGENCY";
  const cost = await getActionCost(action);

  try {
    await db.$transaction(async (tx) => {
      await tx.follow.create({ data: key });
      // The same idempotency key means following again after unfollowing is not charged twice
      await spendInTx(tx, {
        userId: user.id,
        action,
        cost,
        refType: "Follow",
        refId: `${targetType}:${targetId}`,
        idemKey: `follow:${user.id}:${targetType}:${targetId}`,
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { ok: false, code: "INSUFFICIENT_POINTS", error: `Following costs ${e.cost} points and you have ${e.balance}.` };
    }
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: true, following: true }; // a double click already saved it
    }
    throw e;
  }

  revalidatePath("/dashboard/following");
  return { ok: true, following: true };
}