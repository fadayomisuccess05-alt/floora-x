import type { Metadata } from "next";
import { ListingsView } from "@/components/ListingsView";
import type { SP } from "@/lib/properties/queries";

export const metadata: Metadata = { title: "Properties for sale in Nigeria" };

export default async function BuyPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <ListingsView
      title="Properties for sale"
      intro="Houses, land and commercial properties for sale across Nigeria."
      basePath="/buy"
      fixed={{ transactionTypes: ["FOR_SALE"] }}
      searchParams={await searchParams}
    />
  );
}