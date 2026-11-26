import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { FlagToggle, PriceRow, PackageRow } from "./Controls";

export default async function MonetizationPage() {
  await requireUser(["ADMIN"]);

  const [flags, prices, packages, log] = await Promise.all([
    db.featureFlag.findMany(),
    db.actionPrice.findMany({ orderBy: [{ actionGroup: "asc" }, { sortOrder: "asc" }] }),
    db.creditPackage.findMany({ orderBy: { sortOrder: "asc" } }),
    db.monetizationChangeLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const on = (k: string) => flags.find((f) => f.key === k)?.enabled ?? false;

  const adminIds = Array.from(new Set(log.map((l) => l.adminId)));
  const admins = await db.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, fullName: true } });
  const nameOf = (id: string) => admins.find((a) => a.id === id)?.fullName ?? "Admin";

  const clientPrices = prices.filter((p) => p.actionGroup === "CLIENT");
  const proPrices = prices.filter((p) => p.actionGroup === "PROFESSIONAL");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Monetization</h1>
        <p className="mt-2 max-w-2xl text-ink/75">
          Control points, prices and packages. Every change is recorded below. Prices only affect future actions.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Master switches</h2>
        <FlagToggle flagKey="credits_enabled" label="Client points" description="Clients pay points for enquiries and other actions. When off, everything is free and the Points page is hidden." enabled={on("credits_enabled")} locked={false} />
        <FlagToggle flagKey="premium_enabled" label="Premium plans and listing limits" description="Subscriptions and the free-plan limits (1 listing, 3 photos). Do not switch on until subscriptions are built." enabled={on("premium_enabled")} locked />
        <FlagToggle flagKey="boosts_enabled" label="Boosts and promotion" description="Paid promotion of listings." enabled={on("boosts_enabled")} locked />
        <FlagToggle flagKey="trust_enabled" label="Floora-Trust" description="Protected transactions." enabled={on("trust_enabled")} locked />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Client action prices</h2>
        <p className="text-sm text-ink/70">Only the enquiry charge is connected today. Follow and contact-unlock charges connect when those features are built.</p>
        {clientPrices.map((p) => (
          <PriceRow key={p.action} action={p.action} label={p.label} points={p.points} active={p.active} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Professional action prices</h2>
        {proPrices.length === 0 ? (
          <p className="text-sm text-ink/70">Boost prices for landlords, agents and agencies are added with the boost feature.</p>
        ) : (
          proPrices.map((p) => <PriceRow key={p.action} action={p.action} label={p.label} points={p.points} active={p.active} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Top-up packages</h2>
        {packages.map((p) => (
          <PackageRow key={p.id} id={p.id} points={p.points} priceNaira={p.priceNaira} bonusPoints={p.bonusPoints} active={p.active} />
        ))}
        <p className="pt-2 text-sm font-semibold text-navy">Add a package</p>
        <PackageRow id={null} points={500} priceNaira={2500} bonusPoints={0} active />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Change history</h2>
        {log.length === 0 ? (
          <p className="text-sm text-ink/70">No changes yet.</p>
        ) : (
          <div className="divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
            {log.map((l) => (
              <div key={l.id} className="px-4 py-3 text-sm">
                <p className="font-semibold text-navy">
                  {l.entityType} &middot; {l.entityId}
                </p>
                <p className="text-xs text-ink/70 break-all">
                  {JSON.stringify(l.oldValue)} &rarr; {JSON.stringify(l.newValue)}
                </p>
                <p className="text-xs text-ink/50">
                  {nameOf(l.adminId)} &middot;{" "}
                  {l.createdAt.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}