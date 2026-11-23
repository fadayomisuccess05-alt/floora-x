import { PropertyCard } from "./PropertyCard";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { CardItem } from "@/lib/properties/format";

export async function PropertyGrid({ items, className }: { items: CardItem[]; className?: string }) {
  const user = await getCurrentUser();
  const saved = new Set<string>();
  if (user && items.length > 0) {
    const rows = await db.favorite.findMany({
      where: { userId: user.id, propertyId: { in: items.map((i) => i.id) } },
      select: { propertyId: true },
    });
    rows.forEach((r) => saved.add(r.propertyId));
  }
  return (
    <div className={className ?? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
      {items.map((p) => (
        <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} loggedIn={!!user} />
      ))}
    </div>
  );
}