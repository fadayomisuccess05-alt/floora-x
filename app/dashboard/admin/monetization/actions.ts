"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

// Only credits_enabled can be switched for now. The others arrive with their features.
const SWITCHABLE = ["credits_enabled"];

export async function setFlag(key: string, enabled: boolean): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  if (!SWITCHABLE.includes(key)) return fail("This switch is not available yet.");

  const old = await db.featureFlag.findUnique({ where: { key } });
  await db.$transaction([
    db.featureFlag.upsert({
      where: { key },
      create: { key, enabled, updatedById: admin.id },
      update: { enabled, updatedById: admin.id },
    }),
    db.monetizationChangeLog.create({
      data: { adminId: admin.id, entityType: "Switch", entityId: key, oldValue: { enabled: old?.enabled ?? false }, newValue: { enabled } },
    }),
    db.auditLog.create({
      data: { actorId: admin.id, action: "MONETIZATION_SWITCH", entityType: "FeatureFlag", entityId: key, newValues: { enabled } },
    }),
  ]);
  revalidatePath("/dashboard/admin/monetization");
  return { ok: true };
}

export async function saveActionPrice(action: string, points: number, active: boolean): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  if (!Number.isInteger(points) || points < 0 || points > 100000) return fail("Points must be a whole number from 0 to 100,000.");

  const old = await db.actionPrice.findUnique({ where: { action } });
  if (!old) return fail("Action not found.");

  await db.$transaction([
    db.actionPrice.update({ where: { action }, data: { points, active, updatedById: admin.id } }),
    db.monetizationChangeLog.create({
      data: {
        adminId: admin.id,
        entityType: "ActionPrice",
        entityId: action,
        oldValue: { points: old.points, active: old.active },
        newValue: { points, active },
      },
    }),
  ]);
  revalidatePath("/dashboard/admin/monetization");
  return { ok: true };
}

export async function savePackage(
  id: string | null,
  data: { points: number; priceNaira: number; bonusPoints: number; active: boolean }
): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  const { points, priceNaira, bonusPoints, active } = data;
  if (!Number.isInteger(points) || points < 1 || points > 1_000_000) return fail("Points must be a whole number from 1 to 1,000,000.");
  if (!Number.isInteger(priceNaira) || priceNaira < 100 || priceNaira > 100_000_000) return fail("Price must be a whole number of naira, at least ₦100.");
  if (!Number.isInteger(bonusPoints) || bonusPoints < 0 || bonusPoints > points) return fail("Bonus must be a whole number, not more than the points.");

  if (id) {
    const old = await db.creditPackage.findUnique({ where: { id } });
    if (!old) return fail("Package not found.");
    await db.$transaction([
      db.creditPackage.update({ where: { id }, data: { points, priceNaira, bonusPoints, active } }),
      db.monetizationChangeLog.create({
        data: {
          adminId: admin.id,
          entityType: "CreditPackage",
          entityId: id,
          oldValue: { points: old.points, priceNaira: old.priceNaira, bonusPoints: old.bonusPoints, active: old.active },
          newValue: { points, priceNaira, bonusPoints, active },
        },
      }),
    ]);
  } else {
    const last = await db.creditPackage.findFirst({ orderBy: { sortOrder: "desc" } });
    const created = await db.creditPackage.create({
      data: { points, priceNaira, bonusPoints, active, sortOrder: (last?.sortOrder ?? 0) + 10 },
    });
    await db.monetizationChangeLog.create({
      data: { adminId: admin.id, entityType: "CreditPackage", entityId: created.id, oldValue: undefined, newValue: { points, priceNaira, bonusPoints, active } },
    });
  }
  revalidatePath("/dashboard/admin/monetization");
  return { ok: true };
}