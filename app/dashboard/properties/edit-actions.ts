"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import { getLimits } from "@/lib/entitlements";
import { createAdminClient, PROPERTY_BUCKET } from "@/lib/supabase/admin";
import { propertySchema, uploadCap, LISTING_DAYS } from "@/lib/properties/schema";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const EDITABLE = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"] as const;
const DAY = 24 * 60 * 60 * 1000;

type OrderItem = { existingId: string } | { path: string };

async function requirePoster() {
  const user = await requireUser(["LANDLORD", "AGENT", "AGENCY"]);
  const idChecked = await db.verification.findFirst({
    where: { userId: user.id, type: "NIN", status: "VERIFIED" },
  });
  return { user, idChecked: !!idChecked };
}

export async function getEditUploadUrls(
  propertyId: string,
  files: { mime: string; size: number }[]
): Promise<{ ok: true; bucket: string; items: { path: string; token: string }[] } | Fail> {
  const { user, idChecked } = await requirePoster();
  if (!idChecked) return fail("Complete ID verification first.");

  const p = await db.property.findFirst({
    where: { id: propertyId, postedById: user.id, listingStatus: { in: [...EDITABLE] } },
    select: { id: true },
  });
  if (!p) return fail("This listing can't be edited right now.");

  const cap = uploadCap((await getLimits(user.id)).maxPhotosPerListing);
  if (files.length < 1 || files.length > cap) return fail(`You can have up to ${cap} photos.`);
  for (const f of files) {
    if (!IMAGE_TYPES.includes(f.mime) || f.size <= 0 || f.size > MAX_IMAGE_BYTES) {
      return fail("Each photo must be a JPG, PNG or WebP image under 10 MB.");
    }
  }

  const admin = createAdminClient();
  const items: { path: string; token: string }[] = [];
  for (const f of files) {
    const path = `${p.id}/${randomUUID()}.${EXT[f.mime]}`;
    const { data, error } = await admin.storage.from(PROPERTY_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("createSignedUploadUrl (edit) failed:", error?.message);
      return fail("Could not prepare the photo upload. Please try again.");
    }
    items.push({ path, token: data.token });
  }
  return { ok: true, bucket: PROPERTY_BUCKET, items };
}

export async function saveListing(
  propertyId: string,
  input: unknown,
  order: OrderItem[]
): Promise<{ ok: true; status: "PENDING_REVIEW" | "PUBLISHED" } | Fail> {
  const { user, idChecked } = await requirePoster();
  if (!idChecked) return fail("Complete ID verification first.");

  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const d = parsed.data;

  const old = await db.property.findFirst({
    where: { id: propertyId, postedById: user.id, listingStatus: { in: [...EDITABLE] } },
    include: { media: true, amenities: { select: { id: true } } },
  });
  if (!old) return fail("This listing can't be edited right now.");

  const category = await db.propertyCategory.findFirst({ where: { id: d.categoryId, active: true } });
  if (!category) return fail("Choose a valid property category.");

  const limits = await getLimits(user.id);
  const cap = uploadCap(limits.maxPhotosPerListing);
  if (!Array.isArray(order) || order.length < 1 || order.length > cap) {
    return fail(`Keep between 1 and ${cap} photos.`);
  }

  // Check the photo list the browser sent
  const existingIds = new Set(old.media.map((m) => m.id));
  const keptIds = new Set<string>();
  const newPaths: string[] = [];
  for (const item of order) {
    if (typeof item !== "object" || item === null) return fail("Invalid photo list.");
    if ("existingId" in item && typeof item.existingId === "string") {
      if (!existingIds.has(item.existingId) || keptIds.has(item.existingId)) return fail("Invalid photo list.");
      keptIds.add(item.existingId);
    } else if ("path" in item && typeof item.path === "string") {
      const rest = item.path.slice(old.id.length + 1);
      if (!item.path.startsWith(`${old.id}/`) || rest.includes("/")) return fail("Invalid photo.");
      if (old.media.some((m) => m.storageKey === item.path) || newPaths.includes(item.path)) {
        return fail("Invalid photo list.");
      }
      newPaths.push(item.path);
    } else {
      return fail("Invalid photo list.");
    }
  }

  // Check the new photos really are in storage. We don't trust the browser's word.
  const admin = createAdminClient();
  const newMeta = new Map<string, { mime: string; size: number }>();
  if (newPaths.length > 0) {
    const { data: objects, error } = await admin.storage.from(PROPERTY_BUCKET).list(old.id, { limit: 100 });
    if (error || !objects) return fail("Could not check your photos. Please try again.");
    const byName = new Map(objects.map((o) => [o.name, o]));
    for (const path of newPaths) {
      const obj = byName.get(path.slice(old.id.length + 1));
      if (!obj) return fail("A photo did not upload. Please try again.");
      const mime = String(obj.metadata?.mimetype ?? "");
      const size = Number(obj.metadata?.size ?? 0);
      if (!IMAGE_TYPES.includes(mime) || size <= 0 || size > MAX_IMAGE_BYTES) {
        return fail("A photo was rejected (wrong type or too large).");
      }
      newMeta.set(path, { mime, size });
    }
  }

  const amenities = await db.amenity.findMany({
    where: { id: { in: d.amenityIds }, active: true },
    select: { id: true },
  });

  const pricePeriod: "YEAR" | "MONTH" | "DAY" | "ONE_OFF" =
    d.transactionType === "FOR_SALE" ? "ONE_OFF" : d.pricePeriod === "ONE_OFF" ? "YEAR" : d.pricePeriod;

  const next = {
    title: d.title,
    description: d.description,
    categoryId: category.id,
    transactionType: d.transactionType,
    state: d.state,
    lga: d.lga || null,
    city: d.city,
    neighbourhood: d.neighbourhood || null,
    streetAddress: d.streetAddress || null,
    hideExactAddress: d.hideExactAddress,
    bedrooms: category.hasRooms ? d.bedrooms : null,
    bathrooms: category.hasRooms ? d.bathrooms : null,
    toilets: category.hasRooms ? d.toilets : null,
    parkingSpaces: d.parkingSpaces,
    sizeSqm: d.sizeSqm,
    furnishing: d.furnishing,
    yearBuilt: d.yearBuilt,
    priceNaira: BigInt(d.priceNaira),
    pricePeriod,
    negotiable: d.negotiable,
    additionalCharges: d.additionalCharges,
  };

  // Did anything change that a reviewer should look at again? Price fields don't count.
  const norm = (v: unknown) => (v === undefined || v === "" ? null : v);
  const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  const pairs: [unknown, unknown][] = [
    [old.title, next.title],
    [old.description, next.description],
    [old.categoryId, next.categoryId],
    [old.transactionType, next.transactionType],
    [old.state, next.state],
    [old.lga, next.lga],
    [old.city, next.city],
    [old.neighbourhood, next.neighbourhood],
    [old.streetAddress, next.streetAddress],
    [old.bedrooms, next.bedrooms],
    [old.bathrooms, next.bathrooms],
    [old.toilets, next.toilets],
    [old.parkingSpaces, next.parkingSpaces],
    [old.sizeSqm, next.sizeSqm],
    [old.furnishing, next.furnishing],
    [old.yearBuilt, next.yearBuilt],
    [old.amenities.map((a) => a.id).sort(), amenities.map((a) => a.id).sort()],
  ];
  const removed = old.media.filter((m) => !keptIds.has(m.id));
  const material = pairs.some(([a, b]) => !same(a, b)) || removed.length > 0 || newPaths.length > 0;

  const auto = await isEnabled("listing_auto_publish");
  const now = new Date();
  let status = old.listingStatus as "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
  const patch: {
    publishedAt?: Date;
    expiresAt?: Date;
    lastConfirmedAt?: Date;
    rejectionReason?: null;
    reviewedById?: null;
    reviewedAt?: null;
  } = {};

  if (status === "PUBLISHED") {
    if (material && !auto) status = "PENDING_REVIEW";
  } else if (status === "REJECTED" || status === "DRAFT") {
    if (Number.isFinite(limits.maxActiveListings)) {
      const active = await db.property.count({
        where: {
          postedById: user.id,
          id: { not: old.id },
          listingStatus: { in: ["PENDING_REVIEW", "PUBLISHED", "RESERVED"] },
        },
      });
      if (active >= limits.maxActiveListings) {
        return fail("You have reached the number of listings allowed on your plan. Upgrade to add more.");
      }
    }
    patch.rejectionReason = null;
    patch.reviewedById = null;
    patch.reviewedAt = null;
    if (auto) {
      status = "PUBLISHED";
      patch.publishedAt = now;
      patch.expiresAt = new Date(now.getTime() + LISTING_DAYS * DAY);
      patch.lastConfirmedAt = now;
    } else {
      status = "PENDING_REVIEW";
    }
  }

  await db.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: old.id },
      data: {
        ...next,
        ...patch,
        listingStatus: status,
        amenities: { set: amenities.map((a) => ({ id: a.id })) },
      },
    });
    if (removed.length > 0) {
      await tx.propertyMedia.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
    }
    for (const [i, item] of order.entries()) {
      if ("existingId" in item) {
        await tx.propertyMedia.update({
          where: { id: item.existingId },
          data: { sortOrder: i, isCover: i === 0 },
        });
      } else {
        const meta = newMeta.get(item.path)!;
        await tx.propertyMedia.create({
          data: {
            propertyId: old.id,
            kind: "IMAGE",
            storageKey: item.path,
            sortOrder: i,
            isCover: i === 0,
            mimeType: meta.mime,
            sizeBytes: meta.size,
          },
        });
      }
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "PROPERTY_EDITED",
        entityType: "Property",
        entityId: old.id,
        previousValues: { status: old.listingStatus },
        newValues: { status, materialChange: material },
      },
    });
  });

  // Tidy up the photo files that were removed
  if (removed.length > 0) {
    await admin.storage.from(PROPERTY_BUCKET).remove(removed.map((r) => r.storageKey));
  }

  revalidatePath("/dashboard/properties");
  return { ok: true, status: status === "PUBLISHED" ? "PUBLISHED" : "PENDING_REVIEW" };
}