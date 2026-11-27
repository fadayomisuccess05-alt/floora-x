import "server-only";
import { db } from "@/lib/db";

type Note = { type: string; title: string; body?: string; href?: string; refKey: string };

// A notification must never break the action that caused it, so errors are only logged
export async function notify(userId: string, n: Note) {
  try {
    await db.notification.upsert({
      where: { userId_refKey: { userId, refKey: n.refKey } },
      create: { userId, type: n.type, title: n.title, body: n.body ?? null, href: n.href ?? null, refKey: n.refKey },
      update: { title: n.title, body: n.body ?? null, href: n.href ?? null, readAt: null, createdAt: new Date() },
    });
  } catch (e) {
    console.error("notify failed:", e instanceof Error ? e.message : e);
  }
}

// Tells everyone who follows the poster (or their agency) about a newly published listing
export async function notifyFollowersOfNewListing(propertyId: string) {
  try {
    const p = await db.property.findFirst({
      where: { id: propertyId, listingStatus: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        postedById: true,
        agencyId: true,
        postedBy: { select: { fullName: true } },
        agency: { select: { name: true } },
      },
    });
    if (!p) return;

    const targets: { targetType: string; targetId: string }[] = [{ targetType: "AGENT", targetId: p.postedById }];
    if (p.agencyId) targets.push({ targetType: "AGENCY", targetId: p.agencyId });

    const rows = await db.follow.findMany({
      where: { OR: targets },
      select: { followerId: true },
      take: 5000,
    });
    const ids = Array.from(new Set(rows.map((r) => r.followerId))).filter((id) => id !== p.postedById);
    if (ids.length === 0) return;

    const who = p.agency?.name ?? p.postedBy.fullName;
    await db.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: "NEW_LISTING",
        title: `${who} listed a new property`,
        body: `${p.title}, ${p.city}, ${p.state}`,
        href: `/property/${p.id}`,
        refKey: `newlisting:${p.id}`,
      })),
      skipDuplicates: true,
    });
  } catch (e) {
    console.error("notifyFollowers failed:", e instanceof Error ? e.message : e);
  }
}