import "server-only";
import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/properties/media";
import { verifiedMap } from "@/lib/properties/queries";
import type { CardItem } from "@/lib/properties/format";

// Saved properties that are no longer live or have expired are quietly left out
export async function getSavedCards(userId: string): Promise<CardItem[]> {
  const favs = await db.favorite.findMany({
    where: {
      userId,
      property: {
        listingStatus: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      property: {
        include: {
          category: { select: { name: true } },
          media: { where: { isCover: true }, take: 1 },
        },
      },
    },
  });

  const vmap = await verifiedMap(Array.from(new Set(favs.map((f) => f.property.postedById))));

  return favs.map(({ property: r }) => ({
    id: r.id,
    title: r.title,
    priceNaira: Number(r.priceNaira),
    pricePeriod: r.pricePeriod,
    negotiable: r.negotiable,
    transactionType: r.transactionType,
    categoryName: r.category.name,
    city: r.city,
    state: r.state,
    neighbourhood: r.neighbourhood,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sizeSqm: r.sizeSqm,
    cover: r.media[0] ? publicMediaUrl(r.media[0].storageKey) : null,
    idChecked: vmap.get(r.postedById)?.idChecked ?? false,
    addressVerified: vmap.get(r.postedById)?.addressVerified ?? false,
  }));
}