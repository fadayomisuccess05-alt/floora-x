import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/properties/format";

// Finds clients whose saved search matches a newly published listing and notifies them.
// It uses the same notification key as the "followed agent" notice, so nobody gets two.
export async function notifyMatchingAlerts(propertyId: string) {
  try {
    const p = await db.property.findFirst({
      where: { id: propertyId, listingStatus: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        neighbourhood: true,
        lga: true,
        postedById: true,
        transactionType: true,
        bedrooms: true,
        priceNaira: true,
        category: { select: { slug: true, categoryGroup: true } },
        amenities: { select: { slug: true } },
      },
    });
    if (!p) return;

    const purpose = p.transactionType === "FOR_SALE" ? "BUY" : "RENT";

    const and: Prisma.PropertyAlertWhereInput[] = [
      { OR: [{ purpose: null }, { purpose }] },
      { OR: [{ categoryGroup: null }, { categoryGroup: p.category.categoryGroup }] },
      { OR: [{ categorySlug: null }, { categorySlug: p.category.slug }] },
      { OR: [{ minPrice: null }, { minPrice: { lte: p.priceNaira } }] },
      { OR: [{ maxPrice: null }, { maxPrice: { gte: p.priceNaira } }] },
      p.bedrooms !== null
        ? { OR: [{ minBedrooms: null }, { minBedrooms: { lte: p.bedrooms } }] }
        : { minBedrooms: null },
    ];

    const candidates = await db.propertyAlert.findMany({
      where: { active: true, userId: { not: p.postedById }, AND: and },
      select: { userId: true, q: true, amenitySlugs: true },
      take: 5000,
    });

    const haystack = [p.city, p.state, p.neighbourhood, p.lga].filter(Boolean).join(" ").toLowerCase();
    const have = new Set(p.amenities.map((a) => a.slug));
    const users = new Set<string>();

    for (const a of candidates) {
      const words = (a.q ?? "").toLowerCase().split(/[,\s]+/).filter(Boolean);
      if (!words.every((w) => haystack.includes(w))) continue;
      if (!a.amenitySlugs.every((s) => have.has(s))) continue;
      users.add(a.userId);
    }
    if (users.size === 0) return;

    await db.notification.createMany({
      data: Array.from(users).map((userId) => ({
        userId,
        type: "ALERT",
        title: "New property matching your alert",
        body: `${p.title}, ${p.city} · ${formatNaira(Number(p.priceNaira))}`,
        href: `/property/${p.id}`,
        refKey: `newlisting:${p.id}`,
      })),
      skipDuplicates: true,
    });
  } catch (e) {
    console.error("notifyMatchingAlerts failed:", e instanceof Error ? e.message : e);
  }
}