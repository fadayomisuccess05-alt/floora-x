"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/properties/format";

type Result = { ok: true } | { ok: false; error: string; needsLogin?: boolean };

const schema = z.object({
  purpose: z.enum(["BUY", "RENT"]).nullable(),
  categoryGroup: z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND"]).nullable(),
  categorySlug: z.string().max(60).nullable(),
  q: z.string().trim().max(100).nullable(),
  minPrice: z.number().int().min(0).max(10_000_000_000_000).nullable(),
  maxPrice: z.number().int().min(0).max(10_000_000_000_000).nullable(),
  minBedrooms: z.number().int().min(1).max(20).nullable(),
  amenitySlugs: z.array(z.string().max(50)).max(10),
});

export async function createAlert(input: unknown): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return { ok: false, error: "Log in to create an alert.", needsLogin: true };
  if (user.accountType === "ADMIN") return { ok: false, error: "Administrator accounts can't create alerts." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That search could not be saved." };
  const d = parsed.data;

  const count = await db.propertyAlert.count({ where: { userId: user.id } });
  if (count >= 10) return { ok: false, error: "You have 10 alerts, the maximum. Delete one to add another." };

  // A readable name such as "For rent · Lekki · 3+ bedrooms · up to ₦3,000,000"
  const parts: string[] = [];
  if (d.purpose) parts.push(d.purpose === "BUY" ? "For sale" : "For rent");
  if (d.categorySlug) {
    const cat = await db.propertyCategory.findUnique({ where: { slug: d.categorySlug }, select: { name: true } });
    if (cat) parts.push(cat.name);
  } else if (d.categoryGroup === "COMMERCIAL") parts.push("Commercial");
  else if (d.categoryGroup === "LAND") parts.push("Land");
  if (d.q) parts.push(d.q);
  if (d.minBedrooms) parts.push(`${d.minBedrooms}+ bedrooms`);
  if (d.minPrice && d.maxPrice) parts.push(`${formatNaira(d.minPrice)} to ${formatNaira(d.maxPrice)}`);
  else if (d.minPrice) parts.push(`from ${formatNaira(d.minPrice)}`);
  else if (d.maxPrice) parts.push(`up to ${formatNaira(d.maxPrice)}`);
  if (d.amenitySlugs.length > 0) parts.push(`${d.amenitySlugs.length} amenities`);

  await db.propertyAlert.create({
    data: {
      userId: user.id,
      label: parts.join(" · ") || "All new listings",
      purpose: d.purpose,
      categoryGroup: d.categoryGroup,
      categorySlug: d.categorySlug,
      q: d.q || null,
      minPrice: d.minPrice === null ? null : BigInt(d.minPrice),
      maxPrice: d.maxPrice === null ? null : BigInt(d.maxPrice),
      minBedrooms: d.minBedrooms,
      amenitySlugs: d.amenitySlugs,
    },
  });

  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

export async function toggleAlert(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in first.", needsLogin: true };
  const a = await db.propertyAlert.findFirst({ where: { id, userId: user.id } });
  if (!a) return { ok: false, error: "Alert not found." };
  await db.propertyAlert.update({ where: { id }, data: { active: !a.active } });
  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

export async function deleteAlert(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in first.", needsLogin: true };
  await db.propertyAlert.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/alerts");
  return { ok: true };
}