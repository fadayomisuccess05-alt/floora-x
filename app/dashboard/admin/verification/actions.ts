"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type Result = { ok: true } | { ok: false; error: string };

// How long evidence is kept after a decision. A lawyer should confirm the final number.
const RETENTION_DAYS = 30;

export async function approveVerification(id: string): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  const v = await db.verification.findUnique({ where: { id } });
  if (!v) return { ok: false, error: "Submission not found." };
  if (v.status !== "PENDING") return { ok: false, error: "This submission was already reviewed." };

  // One NIN, one account: re-check at approval time
  if (v.type === "NIN" && v.valueHash) {
    const clash = await db.verification.findFirst({
      where: { type: "NIN", valueHash: v.valueHash, status: "VERIFIED", userId: { not: v.userId } },
    });
    if (clash) return { ok: false, error: "Another account already holds this NIN. Reject this submission." };
  }

  const now = new Date();
  const deleteAfter = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = v.type === "ADDRESS" ? new Date(new Date(now).setFullYear(now.getFullYear() + 1)) : null;

  const done = await db.$transaction(async (tx) => {
    const res = await tx.verification.updateMany({
      where: { id, status: "PENDING" }, // stops two admins deciding the same case
      data: {
        status: "VERIFIED",
        verifiedAt: now,
        reviewedAt: now,
        reviewedById: admin.id,
        expiresAt,
        rejectionReason: null,
      },
    });
    if (res.count === 0) return false;
    await tx.verificationEvidence.updateMany({ where: { verificationId: id }, data: { deleteAfter } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "VERIFICATION_APPROVED",
        entityType: "Verification",
        entityId: id,
        previousValues: { status: "PENDING" },
        newValues: { status: "VERIFIED", type: v.type, userId: v.userId },
      },
    });
    return true;
  });

  if (!done) return { ok: false, error: "This submission was already reviewed." };
  revalidatePath("/dashboard/admin/verification");
  return { ok: true };
}

export async function rejectVerification(id: string, reason: string): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  const text = reason.trim();
  if (text.length < 3 || text.length > 300) return { ok: false, error: "Give a short reason (3 to 300 characters)." };

  const v = await db.verification.findUnique({ where: { id } });
  if (!v) return { ok: false, error: "Submission not found." };

  const now = new Date();
  const deleteAfter = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const done = await db.$transaction(async (tx) => {
    const res = await tx.verification.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", rejectionReason: text, reviewedAt: now, reviewedById: admin.id },
    });
    if (res.count === 0) return false;
    await tx.verificationEvidence.updateMany({ where: { verificationId: id }, data: { deleteAfter } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "VERIFICATION_REJECTED",
        entityType: "Verification",
        entityId: id,
        previousValues: { status: "PENDING" },
        newValues: { status: "REJECTED", type: v.type, userId: v.userId, reason: text },
      },
    });
    return true;
  });

  if (!done) return { ok: false, error: "This submission was already reviewed." };
  revalidatePath("/dashboard/admin/verification");
  return { ok: true };
}