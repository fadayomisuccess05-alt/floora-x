import type { Metadata } from "next";
import { ListingsView } from "@/components/ListingsView";
import type { SP } from "@/lib/properties/queries";

export const metadata: Metadata = { title: "Commercial properties in Nigeria" };

export default async function CommercialPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <ListingsView
      title="Commercial properties"
      intro="Offices, shops, warehouses, hotels and other commercial spaces."
      basePath="/commercial"
      fixed={{ group: "COMMERCIAL" }}
      searchParams={await searchParams}
    />
  );
}