import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

function waiting(from: Date) {
  const hours = Math.floor((Date.now() - from.getTime()) / 3600000);
  if (hours < 1) return "less than an hour";
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}

export default async function VerificationQueue() {
  await requireUser(["ADMIN"]);

  const items = await db.verification.findMany({
    where: { status: "PENDING", evidence: { some: {} } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { fullName: true, email: true, accountType: true } },
      _count: { select: { evidence: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Verification queue</h1>
        <p className="mt-2 text-ink/75">
          {items.length === 0 ? "Nothing is waiting for review." : `${items.length} waiting. Oldest first.`}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((v) => (
          <Link
            key={v.id}
            href={`/dashboard/admin/verification/${v.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-5 transition hover:border-teal"
          >
            <div>
              <p className="font-bold text-navy">{v.user.fullName}</p>
              <p className="text-sm text-ink/70">
                {v.user.email} &middot; {v.user.accountType.toLowerCase()}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-teal">{v.type === "NIN" ? "ID check" : "Address check"}</p>
              <p className="text-ink/60">
                Waiting {waiting(v.createdAt)} &middot; {v._count.evidence} files
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}