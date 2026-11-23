import "server-only";
import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/properties/media";
import type { CardItem } from "@/lib/properties/format";

type Where = NonNullable<NonNullable<Parameters<typeof db.property.findMany>[0]>["where"]>;

export type Tx = "FOR_SALE" | "FOR_RENT" | "SHORT_TERM" | "LEASE";
export type Group = "RESIDENTIAL" | "COMMERCIAL" | "LAND";
export type SP = Record<string, string | string[] | undefined>;
export type Fixed = { transactionTypes?: Tx[]; group?: Group };

export const PAGE_SIZE = 12;

export type Filters = {
  q: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  amenities: string[];
  sort: "newest" | "price_asc" | "price_desc";
  page: number;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string) => {
  const t = v.replace(/[^\d]/g, "");
  return t ? Math.min(parseInt(t, 10), 10_000_000_000_000) : null;
};

export function parseFilters(sp: SP): Filters {
  const sort = one(sp.sort);
  const am = sp.amenities;
  return {
    q: one(sp.q).trim().slice(0, 100),
    category: one(sp.category),
    minPrice: num(one(sp.minPrice)),
    maxPrice: num(one(sp.maxPrice)),
    bedrooms: num(one(sp.bedrooms)),
    amenities: (Array.isArray(am) ? am : am ? [am] : []).slice(0, 10),
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
    page: Math.min(1000, Math.max(1, num(one(sp.page)) ?? 1)),
  };
}

// Which posters hold a current ID Checked / Address Verified badge
export async function verifiedMap(userIds: string[]) {
  const map = new Map<string, { idChecked: boolean; addressVerified: boolean }>();
  if (userIds.length === 0) return map;
  const rows = await db.verification.findMany({
    where: { userId: { in: userIds }, status: "VERIFIED", type: { in: ["NIN", "ADDRESS"] } },
    select: { userId: true, type: true, expiresAt: true },
  });
  const now = new Date();
  for (const r of rows) {
    const cur = map.get(r.userId) ?? { idChecked: false, addressVerified: false };
    if (r.type === "NIN") cur.idChecked = true;
    if (r.type === "ADDRESS" && (!r.expiresAt || r.expiresAt > now)) cur.addressVerified = true;
    map.set(r.userId, cur);
  }
  return map;
}

export async function searchProperties(f: Filters, fixed: Fixed = {}, pageSize = PAGE_SIZE) {
  const and: Where[] = [
    { listingStatus: "PUBLISHED" },
    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  ];

  if (fixed.transactionTypes?.length) and.push({ transactionType: { in: fixed.transactionTypes } });
  if (fixed.group) and.push({ category: { categoryGroup: fixed.group } });
  if (f.category) and.push({ category: { slug: f.category } });

  // Every word must match the city, state, area or LGA
  const words = f.q.split(/[,\s]+/).filter(Boolean).slice(0, 5);
  for (const w of words) {
    and.push({
      OR: [
        { city: { contains: w, mode: "insensitive" } },
        { state: { contains: w, mode: "insensitive" } },
        { neighbourhood: { contains: w, mode: "insensitive" } },
        { lga: { contains: w, mode: "insensitive" } },
      ],
    });
  }

  if (f.minPrice) and.push({ priceNaira: { gte: BigInt(f.minPrice) } });
  if (f.maxPrice) and.push({ priceNaira: { lte: BigInt(f.maxPrice) } });
  if (f.bedrooms) and.push({ bedrooms: { gte: f.bedrooms } });
  for (const slug of f.amenities) and.push({ amenities: { some: { slug } } });

  const where: Where = { AND: and };
  const orderBy =
    f.sort === "price_asc"
      ? [{ priceNaira: "asc" as const }]
      : f.sort === "price_desc"
        ? [{ priceNaira: "desc" as const }]
        : [{ publishedAt: "desc" as const }, { createdAt: "desc" as const }];

  const [total, rows] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy,
      skip: (f.page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true } },
        media: { where: { isCover: true }, take: 1 },
      },
    }),
  ]);

  const vmap = await verifiedMap(Array.from(new Set(rows.map((r) => r.postedById))));

  const items: CardItem[] = rows.map((r) => ({
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

  return { items, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}