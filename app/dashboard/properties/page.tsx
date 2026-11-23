import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/properties/media";
import { ListingActions } from "./ListingActions";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-navy/10 text-navy" },
  PENDING_REVIEW: { label: "Awaiting review", cls: "bg-amber/20 text-navy" },
  PUBLISHED: { label: "Live", cls: "bg-teal/15 text-teal" },
  REJECTED: { label: "Not approved", cls: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspended", cls: "bg-red-100 text-red-700" },
  RESERVED: { label: "Reserved", cls: "bg-navy/10 text-navy" },
  RENTED: { label: "Rented", cls: "bg-navy/10 text-navy" },
  SOLD: { label: "Sold", cls: "bg-navy/10 text-navy" },
  EXPIRED: { label: "Expired", cls: "bg-navy/10 text-navy" },
  ARCHIVED: { label: "Taken down", cls: "bg-navy/10 text-navy" },
};
const PERIOD: Record<string, string> = {
  YEAR: " / year",
  MONTH: " / month",
  DAY: " / day",
  ONE_OFF: "",
};

const dateText = (d: Date) =>
  d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function MyProperties({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; updated?: string }>;
}) {
  const user = await requireUser(["LANDLORD", "AGENT", "AGENCY"]);
  const { submitted, updated } = await searchParams;

  const items = await db.property.findMany({
    where: { postedById: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      media: { where: { isCover: true }, take: 1 },
    },
  });
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">My properties</h1>
        <Link
          href="/dashboard/properties/new"
          className="rounded-full bg-amber px-5 py-2.5 text-sm font-bold text-navy"
        >
          Add a property
        </Link>
      </div>

      {submitted && (
        <p className="rounded-xl bg-teal/10 px-4 py-3 text-sm text-navy">
          Your listing was submitted. We will review it and it will appear here
          as Live once approved.
        </p>
      )}

      {updated && (
        <p className="rounded-xl bg-teal/10 px-4 py-3 text-sm text-navy">
          {updated === "live"
            ? "Your changes were saved and the listing is still live."
            : "Your changes were saved. The listing is waiting for review and will be live again once approved."}
        </p>
      )}

      {items.length === 0 && (
        <p className="text-ink/75">You have not added any properties yet.</p>
      )}

      <div className="space-y-3">
        {items.map((p) => {
          const expired =
            p.listingStatus === "PUBLISHED" &&
            !!p.expiresAt &&
            p.expiresAt < now;
          const s = expired ? STATUS.EXPIRED : STATUS[p.listingStatus];
          const cover = p.media[0];
          return (
            <div
              key={p.id}
              className="flex gap-4 rounded-2xl border border-navy/10 bg-white p-4"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicMediaUrl(cover.storageKey)}
                  alt=""
                  className="h-24 w-32 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="h-24 w-32 shrink-0 rounded-xl bg-mist" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold text-navy">{p.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/70">
                  {p.category.name} &middot; {p.city}, {p.state}
                </p>
                <p className="mt-1 text-sm font-semibold text-navy">
                  ₦{Number(p.priceNaira).toLocaleString("en-NG")}
                  {PERIOD[p.pricePeriod]}
                </p>
                {p.listingStatus === "PUBLISHED" && p.expiresAt && (
                  <p className="mt-1 text-xs text-ink/60">
                    {expired ? "Expired on " : "Live until "}
                    {dateText(p.expiresAt)}
                  </p>
                )}
                {p.listingStatus === "REJECTED" && p.rejectionReason && (
                  <p className="mt-1 text-sm text-red-700">
                    Reason: {p.rejectionReason}
                  </p>
                )}
                {p.listingStatus === "PUBLISHED" && !expired && (
                  <Link
                    href={`/property/${p.id}`}
                    className="mt-1 inline-block text-xs font-semibold text-teal hover:underline"
                  >
                    View public page
                  </Link>
                )}
                <ListingActions
                  id={p.id}
                  status={p.listingStatus}
                  expired={expired}
                  transactionType={p.transactionType}
                  everPublished={!!p.publishedAt}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
