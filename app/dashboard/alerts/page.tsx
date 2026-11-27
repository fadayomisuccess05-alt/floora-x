import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AlertRow } from "./AlertRow";

export default async function AlertsPage() {
  const user = await requireUser();
  const alerts = await db.propertyAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Property alerts</h1>
        <p className="mt-2 max-w-2xl text-ink/75">
          Get a notification when a new listing matching your search goes live. To add an alert, search on{" "}
          <Link href="/buy" className="font-semibold text-teal hover:underline">Buy</Link>,{" "}
          <Link href="/rent" className="font-semibold text-teal hover:underline">Rent</Link>,{" "}
          <Link href="/commercial" className="font-semibold text-teal hover:underline">Commercial</Link> or{" "}
          <Link href="/land" className="font-semibold text-teal hover:underline">Land</Link>, set your filters, and tap
          &ldquo;Alert me about new matches&rdquo;.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          You have no alerts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertRow
              key={a.id}
              id={a.id}
              label={a.label}
              active={a.active}
              created={a.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" })}
            />
          ))}
          <p className="text-xs text-ink/60">{alerts.length} of 10 alerts used.</p>
        </div>
      )}
    </div>
  );
}