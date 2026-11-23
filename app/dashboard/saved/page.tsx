import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getSavedCards } from "@/lib/properties/saved";
import { PropertyGrid } from "@/components/PropertyGrid";

export default async function SavedPage() {
  const user = await requireUser();
  const items = await getSavedCards(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Saved properties</h1>
        <p className="mt-2 text-ink/75">Properties you saved. Tap the heart on a card to remove it.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          You have not saved any properties yet.{" "}
          <Link href="/buy" className="font-semibold text-teal hover:underline">Browse properties</Link>
        </div>
      ) : (
        <PropertyGrid items={items} />
      )}
    </div>
  );
}