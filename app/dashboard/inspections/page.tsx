import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fmtLagos, lagosMin } from "@/lib/inspections/time";
import { InspectionActions } from "./InspectionActions";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Requested", cls: "bg-amber/20 text-navy" },
  RESCHEDULED: { label: "New time suggested", cls: "bg-amber/20 text-navy" },
  ACCEPTED: { label: "Confirmed", cls: "bg-teal/15 text-teal" },
  REJECTED: { label: "Declined", cls: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-navy/10 text-navy" },
  COMPLETED: { label: "Completed", cls: "bg-navy/10 text-navy" },
  MISSED: { label: "Missed", cls: "bg-navy/10 text-navy" },
};

export default async function InspectionsPage() {
  const user = await requireUser();
  const rows = await db.inspection.findMany({
    where: { OR: [{ clientId: user.id }, { repId: user.id }] },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      property: { select: { id: true, title: true, city: true, listingStatus: true } },
      client: { select: { fullName: true } },
      rep: { select: { fullName: true } },
    },
  });

  const now = Date.now();
  const isOpenAsk = (s: string) => s === "PENDING" || s === "RESCHEDULED";
  const needsMe = rows.filter((r) => isOpenAsk(r.status) && r.proposedById !== user.id);
  const waiting = rows.filter((r) => isOpenAsk(r.status) && r.proposedById === user.id);
  const upcoming = rows.filter((r) => r.status === "ACCEPTED").sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const closed = rows.filter((r) => !["PENDING", "RESCHEDULED", "ACCEPTED"].includes(r.status));
  const min = lagosMin(3);

  function Card({ r }: { r: (typeof rows)[number] }) {
    const iAmRep = r.repId === user.id;
    const other = iAmRep ? r.client.fullName : r.rep.fullName;
    const s = STATUS[r.status];
    const respond = isOpenAsk(r.status) && r.proposedById !== user.id;
    const canCancel = isOpenAsk(r.status) || r.status === "ACCEPTED";
    const canMark = iAmRep && r.status === "ACCEPTED" && r.scheduledAt.getTime() < now;
    return (
      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-navy">{fmtLagos(r.scheduledAt)}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
        </div>
        <p className="mt-1 text-sm text-ink/75">
          <Link href={`/property/${r.property.id}`} className="font-semibold text-teal hover:underline">
            {r.property.title}
          </Link>{" "}
          &middot; {r.property.city}
        </p>
        <p className="text-sm text-ink/70">
          {iAmRep ? "Requested by" : "Owner"}: {other}
          {isOpenAsk(r.status) && r.proposedById === user.id ? ` · waiting for ${other}` : ""}
        </p>
        {r.note && <p className="mt-1 text-sm text-ink/70">Note: {r.note}</p>}
        {r.responseNote && <p className="mt-1 text-sm text-ink/70">Reply: {r.responseNote}</p>}
        <InspectionActions id={r.id} canRespond={respond} canCancel={canCancel} canMark={canMark} min={min} />
      </div>
    );
  }

  function Group({ title, items }: { title: string; items: typeof rows }) {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {items.map((r) => (
          <Card key={r.id} r={r} />
        ))}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Inspections</h1>
        <p className="mt-2 text-ink/75">Times are shown in Nigerian time.</p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          No inspections yet. Open a property and request one.{" "}
          <Link href="/buy" className="font-semibold text-teal hover:underline">Browse properties</Link>
        </div>
      )}

      <Group title="Needs your response" items={needsMe} />
      <Group title="Upcoming" items={upcoming} />
      <Group title="Waiting for the other person" items={waiting} />
      <Group title="Past and closed" items={closed} />
    </div>
  );
}