"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { LISTING_DAYS } from "@/lib/properties/schema";
import { notify, notifyFollowersOfNewListing } from "@/lib/notifications";
import { notifyMatchingAlerts } from "@/lib/alerts";

type Result = { ok: true } | { ok: false; error: string };

export async function approveListing(id: string): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  const now = new Date();

  const listing = await db.property.findUnique({ where: { id }, select: { postedById: true, title: true } });

  const done = await db.$transaction(async (tx) => {
    const res = await tx.property.updateMany({
      where: { id, listingStatus: "PENDING_REVIEW" }, // stops two admins deciding the same case
      data: {
        listingStatus: "PUBLISHED",
        publishedAt: now,
        expiresAt: new Date(now.getTime() + LISTING_DAYS * 24 * 60 * 60 * 1000),
        lastConfirmedAt: now,
        reviewedById: admin.id,
        reviewedAt: now,
        rejectionReason: null,
      },
    });
    if (res.count === 0) return false;
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PROPERTY_APPROVED",
        entityType: "Property",
        entityId: id,
        previousValues: { status: "PENDING_REVIEW" },
        newValues: { status: "PUBLISHED" },
      },
    });
    return true;
  });

  if (!done) return { ok: false, error: "This listing was already reviewed." };

  if (listing) {
    await notify(listing.postedById, {
      type: "LISTING_APPROVED",
      title: "Your listing is live",
      body: listing.title,
      href: `/property/${id}`,
      refKey: `listing:${id}`,
    });
  }
  await notifyFollowersOfNewListing(id);
  await notifyMatchingAlerts(id);

  revalidatePath("/dashboard/admin/listings");
  return { ok: true };
}

export async function rejectListing(id: string, reason: string): Promise<Result> {
  const admin = await requireUser(["ADMIN"]);
  const text = reason.trim();
  if (text.length < 3 || text.length > 300) return { ok: false, error: "Give a short reason (3 to 300 characters)." };
  const now = new Date();

  const listing = await db.property.findUnique({ where: { id }, select: { postedById: true, title: true } });

  const done = await db.$transaction(async (tx) => {
    const res = await tx.property.updateMany({
      where: { id, listingStatus: "PENDING_REVIEW" },
      data: { listingStatus: "REJECTED", rejectionReason: text, reviewedById: admin.id, reviewedAt: now },
    });
    if (res.count === 0) return false;
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PROPERTY_REJECTED",
        entityType: "Property",
        entityId: id,
        previousValues: { status: "PENDING_REVIEW" },
        newValues: { status: "REJECTED", reason: text },
      },
    });
    return true;
  });

  if (!done) return { ok: false, error: "This listing was already reviewed." };

  if (listing) {
    await notify(listing.postedById, {
      type: "LISTING_REJECTED",
      title: "Your listing was not approved",
      body: `${listing.title}: ${text}`,
      href: `/dashboard/properties/${id}/edit`,
      refKey: `listing:${id}`,
    });
  }

  revalidatePath("/dashboard/admin/listings");
  return { ok: true };
}