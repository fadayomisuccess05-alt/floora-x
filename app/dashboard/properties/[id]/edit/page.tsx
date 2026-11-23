import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLimits } from "@/lib/entitlements";
import { uploadCap } from "@/lib/properties/schema";
import { publicMediaUrl } from "@/lib/properties/media";
import { PropertyForm } from "../../new/PropertyForm";

const EDITABLE = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"];

const NOTE: Record<string, string> = {
  PUBLISHED:
    "This listing is live. Changing only the price keeps it live. Any other change sends it back for review, and it will be hidden until it is approved again.",
  PENDING_REVIEW: "This listing is waiting for review. Your changes will be seen by the reviewer.",
  REJECTED: "Fix the problems mentioned and save to send it for review again.",
  DRAFT: "Finish the listing and save to send it for review.",
};

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["LANDLORD", "AGENT", "AGENCY"]);
  const { id } = await params;

  const p = await db.property.findFirst({
    where: { id, postedById: user.id },
    include: {
      amenities: { select: { id: true } },
      media: { where: { kind: "IMAGE" }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) notFound();

  if (!EDITABLE.includes(p.listingStatus)) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-bold md:text-3xl">This listing can&rsquo;t be edited</h1>
        <p className="text-ink/75">
          Listings that are rented, sold, expired or taken down can&rsquo;t be edited. Relist it first from My properties.
        </p>
        <Link href="/dashboard/properties" className="inline-block rounded-full bg-amber px-6 py-3 font-bold text-navy">
          Back to my properties
        </Link>
      </div>
    );
  }

  const nin = await db.verification.findFirst({ where: { userId: user.id, type: "NIN", status: "VERIFIED" } });
  if (!nin) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-bold md:text-3xl">Verify your identity first</h1>
        <Link href="/dashboard/verification" className="inline-block rounded-full bg-amber px-6 py-3 font-bold text-navy">
          Go to verification
        </Link>
      </div>
    );
  }

  const [categories, amenities, limits] = await Promise.all([
    db.propertyCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.amenity.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getLimits(user.id),
  ]);

  const charges = Array.isArray(p.additionalCharges)
    ? (p.additionalCharges as { label: string; amount: number }[]).map((c) => ({
        label: String(c.label),
        amount: String(c.amount),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Edit property</h1>
        <p className="mt-2 text-ink/75">{NOTE[p.listingStatus]}</p>
        {p.listingStatus === "REJECTED" && p.rejectionReason && (
          <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Reason given: {p.rejectionReason}</p>
        )}
      </div>

      <PropertyForm
        mode="edit"
        propertyId={p.id}
        categories={categories.map((c) => ({ id: c.id, name: c.name, group: c.categoryGroup, hasRooms: c.hasRooms }))}
        amenities={amenities.map((a) => ({ id: a.id, name: a.name }))}
        maxPhotos={uploadCap(limits.maxPhotosPerListing)}
        initial={{
          title: p.title,
          description: p.description,
          categoryId: p.categoryId,
          transactionType: p.transactionType,
          state: p.state,
          lga: p.lga ?? "",
          city: p.city,
          neighbourhood: p.neighbourhood ?? "",
          streetAddress: p.streetAddress ?? "",
          hideExactAddress: p.hideExactAddress,
          bedrooms: p.bedrooms?.toString() ?? "",
          bathrooms: p.bathrooms?.toString() ?? "",
          toilets: p.toilets?.toString() ?? "",
          parkingSpaces: p.parkingSpaces?.toString() ?? "",
          sizeSqm: p.sizeSqm?.toString() ?? "",
          furnishing: p.furnishing ?? "",
          yearBuilt: p.yearBuilt?.toString() ?? "",
          price: String(Number(p.priceNaira)),
          pricePeriod: p.pricePeriod,
          negotiable: p.negotiable,
        }}
        initialCharges={charges}
        initialAmenityIds={p.amenities.map((a) => a.id)}
        existingPhotos={p.media.map((m) => ({ id: m.id, url: publicMediaUrl(m.storageKey) }))}
      />
    </div>
  );
}