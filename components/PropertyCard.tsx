import Link from "next/link";
import { VerifiedBadges } from "./VerifiedBadges";
import { FavoriteButton } from "./FavoriteButton";
import { PERIOD_LABEL, TX_LABEL, formatNaira, type CardItem } from "@/lib/properties/format";

export function PropertyCard({
  p,
  saved = false,
  loggedIn = false,
}: {
  p: CardItem;
  saved?: boolean;
  loggedIn?: boolean;
}) {
  const place = [p.neighbourhood, p.city, p.state].filter(Boolean).join(", ");
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white transition hover:border-teal hover:shadow-lg">
      <Link href={`/property/${p.id}`} className="block">
        <div className="relative aspect-[4/3] bg-mist">
          {p.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-navy/90 px-3 py-1 text-xs font-semibold text-white">
            {TX_LABEL[p.transactionType] ?? p.transactionType}
          </span>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-lg font-bold text-navy">
            {formatNaira(p.priceNaira)}
            <span className="text-sm font-medium text-ink/60">{PERIOD_LABEL[p.pricePeriod]}</span>
            {p.negotiable && <span className="ml-2 text-xs font-semibold text-teal">Negotiable</span>}
          </p>
          <p className="line-clamp-2 font-semibold text-navy">{p.title}</p>
          <p className="text-sm text-ink/70">{place}</p>
          <p className="text-sm text-ink/70">
            {[
              p.categoryName,
              p.bedrooms ? `${p.bedrooms} bed` : null,
              p.bathrooms ? `${p.bathrooms} bath` : null,
              p.sizeSqm ? `${p.sizeSqm} sqm` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <VerifiedBadges idChecked={p.idChecked} addressVerified={p.addressVerified} />
        </div>
      </Link>
      <FavoriteButton propertyId={p.id} saved={saved} loggedIn={loggedIn} className="absolute right-3 top-3 z-10" />
    </div>
  );
}