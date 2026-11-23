"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type Result = { ok: true; saved: boolean } | { ok: false; needsLogin?: boolean; error: string };

export async function toggleFavorite(propertyId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") {
    return { ok: false, needsLogin: true, error: "Log in to save properties." };
  }

  const existing = await db.favorite.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId } },
  });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return { ok: true, saved: false };
  }

  const p = await db.property.findFirst({
    where: { id: propertyId, listingStatus: "PUBLISHED" },
    select: { id: true },
  });
  if (!p) return { ok: false, error: "This property is no longer available." };

  const count = await db.favorite.count({ where: { userId: user.id } });
  if (count >= 200) return { ok: false, error: "You have reached the limit of 200 saved properties." };

  try {
    await db.favorite.create({ data: { userId: user.id, propertyId } });
  } catch {
    // A double click already saved it
  }
  return { ok: true, saved: true };
}