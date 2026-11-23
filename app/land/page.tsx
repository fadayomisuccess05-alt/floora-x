import type { Metadata } from "next";
import { ListingsView } from "@/components/ListingsView";
import type { SP } from "@/lib/properties/queries";

export const metadata: Metadata = { title: "Land for sale in Nigeria" };

export default async function LandPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <ListingsView
      title="Land"
      intro="Residential, commercial, industrial and agricultural land."
      basePath="/land"
      fixed={{ group: "LAND" }}
      searchParams={await searchParams}
    />
  );
}