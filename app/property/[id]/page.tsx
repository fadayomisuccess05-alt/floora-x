import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLimits, visiblePhotos } from "@/lib/entitlements";
import { publicMediaUrl } from "@/lib/properties/media";
import { PERIOD_LABEL, TX_LABEL, formatNaira } from "@/lib/properties/format";
import { searchProperties, verifiedMap } from "@/lib/properties/queries";
import { PropertyGrid } from "@/components/PropertyGrid";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getCurrentUser } from "@/lib/auth/session";
import { VerifiedBadges } from "@/components/VerifiedBadges";
import { Gallery } from "@/components/Gallery";

const FURNISHING: Record<string, string> = {
  UNFURNISHED: "Unfurnished",
  SEMI_FURNISHED: "Semi-furnished",
  FURNISHED: "Furnished",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await db.property.findFirst({
    where: { id, listingStatus: "PUBLISHED" },
    select: {
      title: true,
      description: true,
      media: {
        where: { isCover: true },
        take: 1,
        select: { storageKey: true },
      },
    },
  });
  if (!p) return { title: "Property not found" };
  return {
    title: p.title,
    description: p.description.slice(0, 160),
    openGraph: {
      images: p.media[0] ? [publicMediaUrl(p.media[0].storageKey)] : [],
    },
  };
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="rounded-xl bg-mist p-3">
      <p className="text-xs text-ink/60">{label}</p>
      <p className="font-bold text-navy">{value}</p>
    </div>
  );
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const p = await db.property.findFirst({
    where: { id, listingStatus: "PUBLISHED" },
    include: {
      category: true,
      amenities: true,
      media: { where: { kind: "IMAGE" }, orderBy: { sortOrder: "asc" } },
      postedBy: { select: { id: true, fullName: true, accountType: true } },
      agency: { select: { name: true } },
    },
  });
  if (!p || (p.expiresAt && p.expiresAt < new Date())) notFound();

  // The owner's plan decides how many photos the public sees
  const limits = await getLimits(p.postedById);
  const photos = visiblePhotos(p.media, limits.maxPhotosPerListing);

  const badges = (await verifiedMap([p.postedById])).get(p.postedById);
  const viewer = await getCurrentUser();
  const savedRow = viewer
    ? await db.favorite.findUnique({
        where: { userId_propertyId: { userId: viewer.id, propertyId: p.id } },
      })
    : null;
  const similar = (
    await searchProperties(
      {
        q: p.city,
        category: p.category.slug,
        minPrice: null,
        maxPrice: null,
        bedrooms: null,
        amenities: [],
        sort: "newest",
        page: 1,
      },
      {},
      5,
    )
  ).items
    .filter((x) => x.id !== p.id)
    .slice(0, 4);

  const charges = Array.isArray(p.additionalCharges)
    ? (p.additionalCharges as { label: string; amount: number }[])
    : [];
  const place = [
    p.hideExactAddress ? null : p.streetAddress,
    p.neighbourhood,
    p.city,
    p.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-ink/60">
        <Link href="/" className="hover:text-teal">
          Home
        </Link>{" "}
        /{" "}
        <Link
          href={p.transactionType === "FOR_SALE" ? "/buy" : "/rent"}
          className="hover:text-teal"
        >
          {p.transactionType === "FOR_SALE" ? "Buy" : "Rent"}
        </Link>{" "}
        / <span>{p.city}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Gallery
            photos={photos.map((m) => ({
              id: m.id,
              url: publicMediaUrl(m.storageKey),
            }))}
            title={p.title}
          />

          <div>
            <p className="text-sm font-semibold text-teal">
              {TX_LABEL[p.transactionType]} &middot; {p.category.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold md:text-4xl">{p.title}</h1>
            <p className="mt-2 text-ink/70">{place}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Spec label="Bedrooms" value={p.bedrooms} />
            <Spec label="Bathrooms" value={p.bathrooms} />
            <Spec label="Toilets" value={p.toilets} />
            <Spec label="Parking spaces" value={p.parkingSpaces} />
            <Spec label="Size" value={p.sizeSqm ? `${p.sizeSqm} sqm` : null} />
            <Spec
              label="Furnishing"
              value={p.furnishing ? FURNISHING[p.furnishing] : null}
            />
            <Spec label="Year built" value={p.yearBuilt} />
            <Spec label="LGA" value={p.lga} />
          </div>

          <section>
            <h2 className="text-xl font-bold">About this property</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/85">
              {p.description}
            </p>
          </section>

          {p.amenities.length > 0 && (
            <section>
              <h2 className="text-xl font-bold">Amenities</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-full border border-navy/15 bg-white px-3 py-1 text-sm text-navy"
                  >
                    {a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-navy/10 bg-white p-6">
            <p className="text-3xl font-bold text-navy">
              {formatNaira(Number(p.priceNaira))}
              <span className="text-base font-medium text-ink/60">
                {PERIOD_LABEL[p.pricePeriod]}
              </span>
            </p>
            {p.negotiable && (
              <p className="text-sm font-semibold text-teal">
                Price is negotiable
              </p>
            )}
            <FavoriteButton
              propertyId={p.id}
              saved={!!savedRow}
              loggedIn={!!viewer}
              variant="button"
            />
            {charges.length > 0 && (
              <div className="space-y-1 border-t border-navy/10 pt-3 text-sm">
                <p className="font-semibold text-navy">Other charges</p>
                {charges.map((c) => (
                  <p key={c.label} className="flex justify-between text-ink/80">
                    <span>{c.label}</span>
                    <span className="font-semibold">
                      {formatNaira(Number(c.amount))}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-navy/10 bg-white p-6">
            <p className="text-sm text-ink/60">Listed by</p>
            <p className="font-bold text-navy">{p.postedBy.fullName}</p>
            <p className="text-sm capitalize text-ink/70">
              {p.postedBy.accountType.toLowerCase()}
              {p.agency ? ` · ${p.agency.name}` : ""}
            </p>
            <VerifiedBadges
              idChecked={badges?.idChecked ?? false}
              addressVerified={badges?.addressVerified ?? false}
            />
            <div className="rounded-xl bg-mist p-4 text-sm text-ink/75">
              Enquiries, inspection requests and offers are coming in the next
              update.
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Similar properties</h2>
          <div className="mt-5">
            <PropertyGrid
              items={similar}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
        </section>
      )}
    </div>
  );
}
