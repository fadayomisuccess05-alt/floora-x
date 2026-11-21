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

async function requirePoster() {
  const user = await requireUser(["LANDLORD", "AGENT", "AGENCY"]);
  const idChecked = await db.verification.findFirst({
    where: { userId: user.id, type: "NIN", status: "VERIFIED" },
  });
  return { user, idChecked: !!idChecked };
}

export async function createListing(
  input: unknown,
  draftId?: string
): Promise<{ ok: true; propertyId: string } | Fail> {
  const { user, idChecked } = await requirePoster();
  if (!idChecked) return fail("Complete ID verification before listing a property.");

  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const d = parsed.data;

  const category = await db.propertyCategory.findFirst({ where: { id: d.categoryId, active: true } });
  if (!category) return fail("Choose a valid property category.");

  // Plan limits (they only apply once Monetization is switched on)
  const limits = await getLimits(user.id);
  if (Number.isFinite(limits.maxActiveListings)) {
    const active = await db.property.count({
      where: {
        postedById: user.id,
        listingStatus: { in: ["PENDING_REVIEW", "PUBLISHED", "RESERVED"] },
        ...(draftId ? { id: { not: draftId } } : {}),
      },
    });
    if (active >= limits.maxActiveListings) {
      return fail("You have reached the number of listings allowed on your plan. Upgrade to add more.");
    }
  }

  const pricePeriod: "YEAR" | "MONTH" | "DAY" | "ONE_OFF" =
    d.transactionType === "FOR_SALE" ? "ONE_OFF" : d.pricePeriod === "ONE_OFF" ? "YEAR" : d.pricePeriod;

  const amenities = await db.amenity.findMany({
    where: { id: { in: d.amenityIds }, active: true },
    select: { id: true },
  });

  const data = {
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

  if (draftId) {
    const existing = await db.property.findFirst({
      where: { id: draftId, postedById: user.id, listingStatus: "DRAFT" },
    });
    if (!existing) return fail("This draft no longer exists. Please start again.");
    await db.property.update({
      where: { id: draftId },
      data: { ...data, amenities: { set: amenities.map((a) => ({ id: a.id })) } },
    });
    return { ok: true, propertyId: draftId };
  }

  const membership =
    user.accountType === "AGENCY"
      ? await db.agencyMembership.findFirst({
          where: { userId: user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMINISTRATOR"] } },
        })
      : null;

  const created = await db.property.create({
    data: {
      ...data,
      postedById: user.id,
      agencyId: membership?.agencyId ?? null,
      amenities: { connect: amenities.map((a) => ({ id: a.id })) },
    },
  });
  return { ok: true, propertyId: created.id };
}

export async function getPropertyUploadUrls(
  propertyId: string,
  files: { mime: string; size: number }[]
): Promise<{ ok: true; bucket: string; items: { path: string; token: string }[] } | Fail> {
  const { user, idChecked } = await requirePoster();
  if (!idChecked) return fail("Complete ID verification first.");

  const p = await db.property.findFirst({
    where: { id: propertyId, postedById: user.id, listingStatus: "DRAFT" },
  });
  if (!p) return fail("Listing not found.");

  const limits = await getLimits(user.id);
  const cap = uploadCap(limits.maxPhotosPerListing);
  if (files.length < 1 || files.length > cap) return fail(`Add between 1 and ${cap} photos.`);

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
      console.error("createSignedUploadUrl (property) failed:", error?.message);
      return fail("Could not prepare the photo upload. Please try again.");
    }
    items.push({ path, token: data.token });
  }
  return { ok: true, bucket: PROPERTY_BUCKET, items };
}

export async function finalizeListing(
  propertyId: string,
  paths: string[]
): Promise<{ ok: true; status: "PENDING_REVIEW" | "PUBLISHED" } | Fail> {
  const { user, idChecked } = await requirePoster();
  if (!idChecked) return fail("Complete ID verification first.");

  const p = await db.property.findFirst({
    where: { id: propertyId, postedById: user.id, listingStatus: "DRAFT" },
  });
  if (!p) return fail("Listing not found.");

  const limits = await getLimits(user.id);
  const cap = uploadCap(limits.maxPhotosPerListing);
  if (paths.length < 1 || paths.length > cap) return fail(`Add between 1 and ${cap} photos.`);

  // Check what really exists in storage. We don't trust the browser's word.
  const admin = createAdminClient();
  const { data: objects, error } = await admin.storage.from(PROPERTY_BUCKET).list(p.id, { limit: 100 });
  if (error || !objects) return fail("Could not check your photos. Please try again.");
  const byName = new Map(objects.map((o) => [o.name, o]));

  const rows = [];
  for (const [i, path] of paths.entries()) {
    if (!path.startsWith(`${p.id}/`)) return fail("Invalid photo.");
    const name = path.slice(p.id.length + 1);
    const obj = name.includes("/") ? undefined : byName.get(name);
    if (!obj) return fail("A photo did not upload. Please try again.");
    const mime = String(obj.metadata?.mimetype ?? "");
    const size = Number(obj.metadata?.size ?? 0);
    if (!IMAGE_TYPES.includes(mime) || size <= 0 || size > MAX_IMAGE_BYTES) {
      return fail("A photo was rejected (wrong type or too large).");
    }
    rows.push({
      propertyId: p.id,
      kind: "IMAGE" as const,
      storageKey: path,
      sortOrder: i,
      isCover: i === 0,
      mimeType: mime,
      sizeBytes: size,
    });
  }

  const auto = await isEnabled("listing_auto_publish");
  const status = auto ? ("PUBLISHED" as const) : ("PENDING_REVIEW" as const);
  const now = new Date();

  await db.$transaction([
    db.propertyMedia.deleteMany({ where: { propertyId: p.id } }),
    db.propertyMedia.createMany({ data: rows }),
    db.property.update({
      where: { id: p.id },
      data: {
        listingStatus: status,
        ...(auto
          ? {
              publishedAt: now,
              expiresAt: new Date(now.getTime() + LISTING_DAYS * 24 * 60 * 60 * 1000),
              lastConfirmedAt: now,
            }
          : {}),
      },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: "PROPERTY_SUBMITTED",
        entityType: "Property",
        entityId: p.id,
        newValues: { status, photos: rows.length },
      },
    }),
  ]);

  revalidatePath("/dashboard/properties");
  return { ok: true, status };
}