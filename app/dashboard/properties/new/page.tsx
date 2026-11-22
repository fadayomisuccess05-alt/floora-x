import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLimits } from "@/lib/entitlements";
import { uploadCap } from "@/lib/properties/schema";
import { PropertyForm } from "./PropertyForm";

export default async function NewPropertyPage() {
  const user = await requireUser(["LANDLORD", "AGENT", "AGENCY"]);

  const nin = await db.verification.findFirst({
    where: { userId: user.id, type: "NIN" },
    orderBy: { createdAt: "desc" },
  });

  if (nin?.status !== "VERIFIED") {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-bold md:text-3xl">Verify your identity first</h1>
        <p className="text-ink/75">
          To keep Floora-X safe from fake listings, you need an approved ID check before you can list a property.
        </p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Add a property</h1>
        <p className="mt-2 text-ink/75">Every listing is checked by the Floora-X team before it goes live.</p>
      </div>
      <PropertyForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, group: c.categoryGroup, hasRooms: c.hasRooms }))}
        amenities={amenities.map((a) => ({ id: a.id, name: a.name }))}
        maxPhotos={uploadCap(limits.maxPhotosPerListing)}
      />
    </div>
  );
}