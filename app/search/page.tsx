import { redirect } from "next/navigation";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SearchRedirect({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const type = one(sp.type);
  const target =
    type === "commercial" ? "/commercial" : type === "land" ? "/land" : one(sp.for) === "rent" ? "/rent" : "/buy";
  const q = one(sp.location).trim();
  redirect(q ? `${target}?q=${encodeURIComponent(q)}` : target);
}