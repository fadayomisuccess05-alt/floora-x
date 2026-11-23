import Link from "next/link";
import { db } from "@/lib/db";
import { PropertyGrid } from "./PropertyGrid";
import {
  parseFilters,
  searchProperties,
  type Fixed,
  type SP,
} from "@/lib/properties/queries";

const input =
  "w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

function pageHref(basePath: string, sp: SP, page: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || v === undefined) continue;
    (Array.isArray(v) ? v : [v]).forEach((x) => p.append(k, x));
  }
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export async function ListingsView({
  title,
  intro,
  basePath,
  fixed,
  searchParams,
}: {
  title: string;
  intro: string;
  basePath: string;
  fixed: Fixed;
  searchParams: SP;
}) {
  const f = parseFilters(searchParams);

  const [categories, amenities, result] = await Promise.all([
    db.propertyCategory.findMany({
      where: {
        active: true,
        ...(fixed.group ? { categoryGroup: fixed.group } : {}),
      },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    db.amenity.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    searchProperties(f, fixed),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-ink/75">{intro}</p>

      <form
        action={basePath}
        method="get"
        className="mt-8 space-y-4 rounded-2xl border border-navy/10 bg-white p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={f.q}
            placeholder="State, city or area"
            aria-label="Location"
            className={input}
          />
          <select
            name="category"
            defaultValue={f.category}
            aria-label="Category"
            className={input}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="minPrice"
            defaultValue={f.minPrice ?? ""}
            inputMode="numeric"
            placeholder="Min price (₦)"
            aria-label="Minimum price"
            className={input}
          />
          <input
            name="maxPrice"
            defaultValue={f.maxPrice ?? ""}
            inputMode="numeric"
            placeholder="Max price (₦)"
            aria-label="Maximum price"
            className={input}
          />
          <select
            name="bedrooms"
            defaultValue={f.bedrooms ? String(f.bedrooms) : ""}
            aria-label="Bedrooms"
            className={input}
          >
            <option value="">Any bedrooms</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+ bedrooms
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={f.sort}
            aria-label="Sort"
            className={input}
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>

        <details open={f.amenities.length > 0}>
          <summary className="cursor-pointer text-sm font-semibold text-navy">
            Amenities
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map((a) => (
              <label
                key={a.slug}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  name="amenities"
                  value={a.slug}
                  defaultChecked={f.amenities.includes(a.slug)}
                />
                {a.name}
              </label>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-amber px-6 py-2.5 text-sm font-bold text-navy">
            Search
          </button>
          <Link
            href={basePath}
            className="rounded-full border border-navy/15 px-6 py-2.5 text-sm font-semibold text-navy"
          >
            Clear
          </Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-ink/70">
        {result.total === 0
          ? "No properties found."
          : `${result.total} ${result.total === 1 ? "property" : "properties"} found`}
      </p>

      {result.total === 0 ? (
        <div className="mt-4 rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          Try removing some filters or searching a wider area.
        </div>
      ) : (
        <div className="mt-4">
          <PropertyGrid items={result.items} />
        </div>
      )}

      {result.pages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-3"
          aria-label="Pages"
        >
          {f.page > 1 && (
            <Link
              href={pageHref(basePath, searchParams, f.page - 1)}
              className="rounded-full border border-navy/15 px-5 py-2 text-sm font-semibold text-navy"
            >
              &larr; Previous
            </Link>
          )}
          <span className="text-sm text-ink/70">
            Page {f.page} of {result.pages}
          </span>
          {f.page < result.pages && (
            <Link
              href={pageHref(basePath, searchParams, f.page + 1)}
              className="rounded-full border border-navy/15 px-5 py-2 text-sm font-semibold text-navy"
            >
              Next &rarr;
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
