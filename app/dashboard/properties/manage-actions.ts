"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLimits } from "@/lib/entitlements";
import { createAdminClient, PROPERTY_BUCKET } from "@/lib/supabase/admin";
import { LISTING_DAYS } from "@/lib/properties/schema";

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const DAY = 24 * 60 * 60 * 1000;

export async function manageListing(id: string, action: string): Promise<Result> {
  const user = await requireUser(["LANDLORD", "AGENT", "AGENCY"]);
  const p = await db.property.findFirst({ where: { id, postedById: user.id } });
  if (!p) return fail("Listing not found.");

  const now = new Date();
  const status = p.listingStatus;
  let next: Record<string, unknown> | null = null;
  let note: string = action;

  switch (action) {
    case "MARK_DONE": {
      if (status !== "PUBLISHED" && status !== "RESERVED") return fail("Only live listings can be marked.");
      next = { listingStatus: p.transactionType === "FOR_SALE" ? "SOLD" : "RENTED" };
      break;
    }
    case "RENEW": {
      if (status !== "PUBLISHED") return fail("Only live listings can be renewed.");
      next = { expiresAt: new Date(now.getTime() + LISTING_DAYS * DAY), lastConfirmedAt: now };
      break;
    }
    case "TAKE_DOWN": {
      if (!["PUBLISHED", "PENDING_REVIEW", "RESERVED"].includes(status)) return fail("This listing can't be taken down.");
      next = { listingStatus: "ARCHIVED" };
      break;
    }
    case "RELIST": {
      if (!["ARCHIVED", "EXPIRED", "RENTED", "SOLD", "RESERVED"].includes(status)) return fail("This listing can't be relisted.");
      if (!p.publishedAt) return fail("This listing was never approved, so it can't be relisted.");

      const limits = await getLimits(user.id);
      if (Number.isFinite(limits.maxActiveListings)) {
        const active = await db.property.count({
          where: {
            postedById: user.id,
            id: { not: p.id },
            listingStatus: { in: ["PENDING_REVIEW", "PUBLISHED", "RESERVED"] },
          },
        });
        if (active >= limits.maxActiveListings) {
          return fail("You have reached the number of listings allowed on your plan. Upgrade to add more.");
        }
      }
      next = {
        listingStatus: "PUBLISHED",
        publishedAt: now,
        expiresAt: new Date(now.getTime() + LISTING_DAYS * DAY),
        lastConfirmedAt: now,
      };
      break;
    }
    case "DELETE": {
      const deletable = status === "DRAFT" || status === "REJECTED" || (status === "ARCHIVED" && !p.publishedAt);
      if (!deletable) return fail("Live listings can't be deleted. Take it down instead.");

      // Remove the photos from storage, then the listing
      const admin = createAdminClient();
      const { data: objects } = await admin.storage.from(PROPERTY_BUCKET).list(p.id, { limit: 100 });
      if (objects && objects.length > 0) {
        await admin.storage.from(PROPERTY_BUCKET).remove(objects.map((o) => `${p.id}/${o.name}`));
      }
      await db.$transaction([
        db.property.delete({ where: { id: p.id } }),
        db.auditLog.create({
          data: {
            actorId: user.id,
            action: "PROPERTY_DELETE",
            entityType: "Property",
            entityId: p.id,
            previousValues: { status },
          },
        }),
      ]);
      revalidatePath("/dashboard/properties");
      return { ok: true };
    }
    default:
      return fail("Unknown action.");
  }

  await db.$transaction([
    db.property.update({ where: { id: p.id }, data: next }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: `PROPERTY_${note}`,
        entityType: "Property",
        entityId: p.id,
        previousValues: { status },
        newValues: next as object,
      },
    }),
  ]);

  revalidatePath("/dashboard/properties");
  return { ok: true };
}