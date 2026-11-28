"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { fmtLagos, parseLagos } from "@/lib/inspections/time";
import { InsufficientPointsError, getActionCost, refundByKeyInTx, spendInTx } from "@/lib/points/wallet";

type Result = { ok: true } | { ok: false; error: string; needsLogin?: boolean; code?: string };
const fail = (error: string, needsLogin = false): Result => ({ ok: false, error, needsLogin });

const HOUR = 3600 * 1000;
const OPEN = ["PENDING", "RESCHEDULED", "ACCEPTED"] as const;

function checkTime(local: string): { at: Date } | { error: string } {
  const at = parseLagos(local);
  if (!at) return { error: "Choose a valid date and time." };
  const hour = Number(local.slice(11, 13));
  if (hour < 7 || hour > 18) return { error: "Inspections can be booked between 7:00 am and 6:59 pm." };
  if (at.getTime() < Date.now() + 2 * HOUR) return { error: "Choose a time at least 2 hours from now." };
  if (at.getTime() > Date.now() + 60 * 24 * HOUR) return { error: "Choose a date within the next 60 days." };
  return { at };
}

export async function requestInspection(propertyId: string, whenLocal: string, note: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in to request an inspection.", true);
  if (user.accountType === "ADMIN") return fail("Administrator accounts can't request inspections.");

  const t = checkTime(whenLocal);
  if ("error" in t) return fail(t.error);

  const p = await db.property.findFirst({
    where: { id: propertyId, listingStatus: "PUBLISHED" },
    select: { id: true, title: true, postedById: true, expiresAt: true },
  });
  if (!p || (p.expiresAt && p.expiresAt < new Date())) return fail("This property is no longer available.");
  if (p.postedById === user.id) return fail("This is your own listing.");

  const open = await db.inspection.findFirst({
    where: { propertyId: p.id, clientId: user.id, status: { in: [...OPEN] } },
    select: { id: true },
  });
  if (open) return fail("You already have an inspection for this property. Manage it under Inspections.");

  const today = await db.inspection.count({
    where: { clientId: user.id, createdAt: { gte: new Date(Date.now() - 24 * HOUR) } },
  });
  if (today >= 10) return fail("You have requested many inspections today. Please try again tomorrow.");

  // Zero while the points system is switched off
  const cost = await getActionCost("REQUEST_INSPECTION");

  let createdId: string;
  try {
    const created = await db.$transaction(async (tx) => {
      const insp = await tx.inspection.create({
        data: {
          propertyId: p.id,
          clientId: user.id,
          repId: p.postedById,
          scheduledAt: t.at,
          proposedById: user.id,
          status: "PENDING",
          note: note.trim().slice(0, 300) || null,
        },
      });
      await spendInTx(tx, {
        userId: user.id,
        action: "REQUEST_INSPECTION",
        cost,
        refType: "Inspection",
        refId: insp.id,
        idemKey: `inspection:${insp.id}`,
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "INSPECTION_REQUESTED",
          entityType: "Inspection",
          entityId: insp.id,
          newValues: { propertyId: p.id, pointsCharged: cost },
        },
      });
      return insp;
    });
    createdId = created.id;
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return {
        ok: false,
        code: "INSUFFICIENT_POINTS",
        error: `This inspection request costs ${e.cost} points and you have ${e.balance}.`,
      };
    }
    throw e;
  }

  await notify(p.postedById, {
    type: "INSPECTION",
    title: "New inspection request",
    body: `${user.fullName} wants to inspect "${p.title}" on ${fmtLagos(t.at)}`,
    href: "/dashboard/inspections",
    refKey: `insp:${createdId}`,
  });

  revalidatePath("/dashboard/inspections");
  return { ok: true };
}

export async function respondInspection(
  id: string,
  action: "ACCEPT" | "REJECT" | "COUNTER",
  whenLocal?: string,
  note?: string
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in first.", true);

  const i = await db.inspection.findUnique({
    where: { id },
    include: { property: { select: { title: true } } },
  });
  if (!i || (i.clientId !== user.id && i.repId !== user.id)) return fail("Inspection not found.");
  if (i.status !== "PENDING" && i.status !== "RESCHEDULED") return fail("This request has already been answered.");
  if (i.proposedById === user.id) return fail("You are waiting for the other person to respond.");

  const iAmRep = i.repId === user.id;
  const otherId = iAmRep ? i.clientId : i.repId;
  const text = (note ?? "").trim().slice(0, 300) || null;
  const stillOpen = { id: i.id, status: { in: ["PENDING", "RESCHEDULED"] as ("PENDING" | "RESCHEDULED")[] } };

  if (action === "ACCEPT") {
    if (i.scheduledAt.getTime() < Date.now() + HOUR) return fail("This time has passed or is too soon. Suggest another time.");
    const res = await db.inspection.updateMany({ where: stillOpen, data: { status: "ACCEPTED", responseNote: text } });
    if (res.count === 0) return fail("This request was just updated. Please refresh.");
    await notify(otherId, {
      type: "INSPECTION",
      title: "Inspection confirmed",
      body: `"${i.property.title}" on ${fmtLagos(i.scheduledAt)}`,
      href: "/dashboard/inspections",
      refKey: `insp:${i.id}`,
    });
  } else if (action === "REJECT") {
    // When the owner declines, the client's points are given back
    const changed = await db.$transaction(async (tx) => {
      const r = await tx.inspection.updateMany({ where: stillOpen, data: { status: "REJECTED", responseNote: text } });
      if (r.count > 0 && iAmRep) await refundByKeyInTx(tx, `inspection:${i.id}`);
      return r.count;
    });
    if (changed === 0) return fail("This request was just updated. Please refresh.");
    await notify(otherId, {
      type: "INSPECTION",
      title: "Inspection declined",
      body: `"${i.property.title}"${text ? `: ${text}` : ""}`,
      href: "/dashboard/inspections",
      refKey: `insp:${i.id}`,
    });
  } else if (action === "COUNTER") {
    const t = checkTime(whenLocal ?? "");
    if ("error" in t) return fail(t.error);
    const res = await db.inspection.updateMany({
      where: stillOpen,
      data: { scheduledAt: t.at, proposedById: user.id, status: iAmRep ? "RESCHEDULED" : "PENDING", responseNote: text },
    });
    if (res.count === 0) return fail("This request was just updated. Please refresh.");
    await notify(otherId, {
      type: "INSPECTION",
      title: "New inspection time suggested",
      body: `"${i.property.title}": ${fmtLagos(t.at)}`,
      href: "/dashboard/inspections",
      refKey: `insp:${i.id}`,
    });
  } else {
    return fail("Unknown action.");
  }

  await db.auditLog.create({
    data: { actorId: user.id, action: `INSPECTION_${action}`, entityType: "Inspection", entityId: i.id },
  });
  revalidatePath("/dashboard/inspections");
  return { ok: true };
}

export async function cancelInspection(id: string, note?: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in first.", true);

  const i = await db.inspection.findUnique({ where: { id }, include: { property: { select: { title: true } } } });
  if (!i || (i.clientId !== user.id && i.repId !== user.id)) return fail("Inspection not found.");

  const iAmRep = i.repId === user.id;

  // When the owner cancels, the client's points are given back
  const changed = await db.$transaction(async (tx) => {
    const r = await tx.inspection.updateMany({
      where: { id: i.id, status: { in: [...OPEN] } },
      data: { status: "CANCELLED", responseNote: (note ?? "").trim().slice(0, 300) || null },
    });
    if (r.count > 0 && iAmRep) await refundByKeyInTx(tx, `inspection:${i.id}`);
    return r.count;
  });
  if (changed === 0) return fail("This inspection can no longer be cancelled.");

  await notify(iAmRep ? i.clientId : i.repId, {
    type: "INSPECTION",
    title: "Inspection cancelled",
    body: `"${i.property.title}" on ${fmtLagos(i.scheduledAt)}`,
    href: "/dashboard/inspections",
    refKey: `insp:${i.id}`,
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: "INSPECTION_CANCELLED", entityType: "Inspection", entityId: i.id },
  });
  revalidatePath("/dashboard/inspections");
  return { ok: true };
}

// The owner records what happened once the appointment time has passed
export async function markInspection(id: string, outcome: "COMPLETED" | "MISSED"): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in first.", true);

  const i = await db.inspection.findUnique({ where: { id }, include: { property: { select: { title: true } } } });
  if (!i || i.repId !== user.id) return fail("Inspection not found.");
  if (i.status !== "ACCEPTED") return fail("Only confirmed inspections can be marked.");
  if (i.scheduledAt.getTime() > Date.now()) return fail("You can mark this after the appointment time.");

  const res = await db.inspection.updateMany({ where: { id: i.id, status: "ACCEPTED" }, data: { status: outcome } });
  if (res.count === 0) return fail("This inspection was just updated. Please refresh.");

  await notify(i.clientId, {
    type: "INSPECTION",
    title: outcome === "COMPLETED" ? "Inspection completed" : "Inspection marked as missed",
    body: `"${i.property.title}"`,
    href: "/dashboard/inspections",
    refKey: `insp:${i.id}`,
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: `INSPECTION_${outcome}`, entityType: "Inspection", entityId: i.id },
  });
  revalidatePath("/dashboard/inspections");
  return { ok: true };
}