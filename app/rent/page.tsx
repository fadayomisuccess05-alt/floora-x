import type { Metadata } from "next";
import { ListingsView } from "@/components/ListingsView";
import type { SP } from "@/lib/properties/queries";

export const metadata: Metadata = { title: "Properties for rent in Nigeria" };

export default async function RentPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <ListingsView
      title="Properties for rent"
      intro="Apartments, houses and spaces to rent or lease across Nigeria."
      basePath="/rent"
      fixed={{ transactionTypes: ["FOR_RENT", "SHORT_TERM", "LEASE"] }}
      searchParams={await searchParams}
    />
  );
}