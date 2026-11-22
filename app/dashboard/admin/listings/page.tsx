import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/properties/media";

function waiting(from: Date) {
  const hours = Math.floor((Date.now() - from.getTime()) / 3600000);
  if (hours < 1) return "less than an hour";
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}

export default async function ListingQueue() {
  await requireUser(["ADMIN"]);

  const items = await db.property.findMany({
    where: { listingStatus: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      category: { select: { name: true } },
      postedBy: { select: { fullName: true, accountType: true } },
      media: { where: { isCover: true }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Listing approvals</h1>
        <p className="mt-2 text-ink/75">
          {items.length === 0 ? "Nothing is waiting for review." : `${items.length} waiting. Oldest first.`}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/admin/listings/${p.id}`}
            className="flex gap-4 rounded-2xl border border-navy/10 bg-white p-4 transition hover:border-teal"
          >
            {p.media[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicMediaUrl(p.media[0].storageKey)} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="h-20 w-28 shrink-0 rounded-xl bg-mist" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-navy">{p.title}</p>
              <p className="text-sm text-ink/70">
                {p.category.name} &middot; {p.city}, {p.state}
              </p>
              <p className="text-sm text-ink/70">
                By {p.postedBy.fullName} ({p.postedBy.accountType.toLowerCase()}) &middot; waiting {waiting(p.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}