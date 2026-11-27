import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { FollowButton } from "@/components/FollowButton";

export default async function FollowingPage() {
  const user = await requireUser();
  const follows = await db.follow.findMany({ where: { followerId: user.id }, orderBy: { createdAt: "desc" } });

  const agentIds = follows.filter((f) => f.targetType === "AGENT").map((f) => f.targetId);
  const agencyIds = follows.filter((f) => f.targetType === "AGENCY").map((f) => f.targetId);
  const live = { listingStatus: "PUBLISHED" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };

  const [agents, agencies, agentCounts, agencyCounts] = await Promise.all([
    db.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, fullName: true, city: true, state: true } }),
    db.agency.findMany({ where: { id: { in: agencyIds } }, select: { id: true, name: true, city: true, state: true } }),
    db.property.groupBy({ by: ["postedById"], where: { postedById: { in: agentIds }, ...live }, _count: { _all: true } }),
    db.property.groupBy({ by: ["agencyId"], where: { agencyId: { in: agencyIds }, ...live }, _count: { _all: true } }),
  ]);

  const rows = follows.flatMap((f) => {
    if (f.targetType === "AGENT") {
      const a = agents.find((x) => x.id === f.targetId);
      if (!a) return [];
      return [{ f, name: a.fullName, kind: "Agent", place: [a.city, a.state].filter(Boolean).join(", "), count: agentCounts.find((c) => c.postedById === a.id)?._count._all ?? 0 }];
    }
    const a = agencies.find((x) => x.id === f.targetId);
    if (!a) return [];
    return [{ f, name: a.name, kind: "Agency", place: [a.city, a.state].filter(Boolean).join(", "), count: agencyCounts.find((c) => c.agencyId === a.id)?._count._all ?? 0 }];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Following</h1>
        <p className="mt-2 text-ink/75">You get a notification whenever they publish a new listing.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          You are not following anyone yet. Open a property and tap <strong>Follow</strong> to follow the agent or agency behind it.{" "}
          <Link href="/buy" className="font-semibold text-teal hover:underline">Browse properties</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ f, name, kind, place, count }) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white p-4">
              <div>
                <p className="font-bold text-navy">{name}</p>
                <p className="text-sm text-ink/70">
                  {kind}{place ? ` · ${place}` : ""} · {count} live {count === 1 ? "listing" : "listings"}
                </p>
              </div>
              <FollowButton
                targetType={f.targetType as "AGENT" | "AGENCY"}
                targetId={f.targetId}
                label="Follow"
                following
                loggedIn
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}