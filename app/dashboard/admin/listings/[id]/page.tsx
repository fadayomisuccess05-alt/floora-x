import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/properties/media";
import { TRANSACTION_OPTIONS } from "@/lib/properties/schema";
import { ListingReview } from "./ListingReview";

const PERIOD: Record<string, string> = { YEAR: " / year", MONTH: " / month", DAY: " / day", ONE_OFF: "" };
const FURNISHING: Record<string, string> = {
  UNFURNISHED: "Unfurnished",
  SEMI_FURNISHED: "Semi-furnished",
  FURNISHED: "Furnished",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <p className="text-sm">
      <span className="text-ink/60">{label}:</span> <strong>{value}</strong>
    </p>
  );
}

export default async function ListingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;

  const p = await db.property.findUnique({
    where: { id },
    include: {
      category: true,
      amenities: true,
      media: { orderBy: { sortOrder: "asc" } },
      postedBy: true,
      agency: { select: { name: true } },
    },
  });
  if (!p) notFound();

  const [nin, address] = await Promise.all([
    db.verification.findFirst({ where: { userId: p.postedById, type: "NIN", status: "VERIFIED" } }),
    db.verification.findFirst({
      where: {
        userId: p.postedById,
        type: "ADDRESS",
        status: "VERIFIED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  if (p.listingStatus !== "PENDING_REVIEW") {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/admin/listings" className="text-sm font-semibold text-teal">&larr; Back to queue</Link>
        <h1 className="text-2xl font-bold">Already reviewed</h1>
        <p className="text-ink/75">
          Status: <strong>{p.listingStatus}</strong>
          {p.rejectionReason ? ` (${p.rejectionReason})` : ""}
        </p>
      </div>
    );
  }

  const charges = Array.isArray(p.additionalCharges)
    ? (p.additionalCharges as { label: string; amount: number }[])
    : [];
  const txLabel = TRANSACTION_OPTIONS.find((t) => t.value === p.transactionType)?.label ?? p.transactionType;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/admin/listings" className="text-sm font-semibold text-teal">&larr; Back to queue</Link>

      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{p.title}</h1>
        <p className="mt-1 text-ink/75">
          {p.category.name} &middot; {txLabel} &middot; {p.city}, {p.state}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {p.media.map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={publicMediaUrl(m.storageKey)}
                alt={`Photo ${i + 1}`}
                className={`w-full rounded-xl object-cover ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
              />
            ))}
          </div>

          <div className="space-y-2 rounded-2xl border border-navy/10 bg-white p-5">
            <p className="text-2xl font-bold text-navy">
              ₦{Number(p.priceNaira).toLocaleString("en-NG")}
              <span className="text-base font-medium text-ink/60">{PERIOD[p.pricePeriod]}</span>
            </p>
            <Row label="Negotiable" value={p.negotiable ? "Yes" : "No"} />
            {charges.map((c) => (
              <Row key={c.label} label={c.label} value={`₦${Number(c.amount).toLocaleString("en-NG")}`} />
            ))}
          </div>

          <div className="space-y-2 rounded-2xl border border-navy/10 bg-white p-5">
            <h2 className="font-bold text-navy">Details</h2>
            <Row label="Bedrooms" value={p.bedrooms} />
            <Row label="Bathrooms" value={p.bathrooms} />
            <Row label="Toilets" value={p.toilets} />
            <Row label="Parking spaces" value={p.parkingSpaces} />
            <Row label="Size" value={p.sizeSqm ? `${p.sizeSqm} sqm` : null} />
            <Row label="Furnishing" value={p.furnishing ? FURNISHING[p.furnishing] : null} />
            <Row label="Year built" value={p.yearBuilt} />
            <Row label="LGA" value={p.lga} />
            <Row label="Neighbourhood" value={p.neighbourhood} />
            <Row label="Street address" value={p.streetAddress} />
            <Row label="Address hidden from public" value={p.hideExactAddress ? "Yes" : "No"} />
            <Row label="Amenities" value={p.amenities.map((a) => a.name).join(", ")} />
            <p className="whitespace-pre-line pt-2 text-sm text-ink">{p.description}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-1 rounded-2xl border border-navy/10 bg-white p-5">
            <h2 className="font-bold text-navy">Posted by</h2>
            <Row label="Name" value={p.postedBy.fullName} />
            <Row label="Account type" value={p.postedBy.accountType.toLowerCase()} />
            <Row label="Agency" value={p.agency?.name} />
            <Row label="Email" value={p.postedBy.email} />
            <Row label="Phone" value={p.postedBy.phone} />
            <p className="pt-2 text-sm">
              ID Checked: <strong className={nin ? "text-teal" : "text-red-600"}>{nin ? "Yes" : "No"}</strong>
              {" · "}
              Address Verified: <strong className={address ? "text-teal" : "text-ink/60"}>{address ? "Yes" : "No"}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-navy/10 bg-white p-5">
            <ListingReview id={p.id} />
          </div>
        </div>
      </div>
    </div>
  );
}