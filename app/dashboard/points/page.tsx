import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import { getBalance } from "@/lib/points/wallet";
import { BuyPackage } from "./BuyPackage";

const REASON: Record<string, string> = {
  TOPUP: "Points purchased",
  SPEND: "Spent",
  REFUND: "Refund",
  BONUS: "Bonus points",
  ADJUSTMENT: "Adjustment",
};
const ACTION: Record<string, string> = {
  SEND_ENQUIRY: "Enquiry",
  FOLLOW_AGENT: "Follow an agent",
  FOLLOW_AGENCY: "Follow an agency",
  UNLOCK_CONTACT: "Unlock a phone number",
  REQUEST_INSPECTION: "Inspection request",
};
const PAID: Record<string, { text: string; ok: boolean }> = {
  credited: { text: "Payment received. Your points have been added.", ok: true },
  already: { text: "Payment received. Your points have been added.", ok: true },
  pending: { text: "We have not received confirmation yet. Your points are added automatically once Paystack confirms.", ok: false },
  failed: { text: "The payment did not go through. You were not charged.", ok: false },
  unknown: { text: "We could not find that payment.", ok: false },
};

export default async function PointsPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const user = await requireUser();
  if (user.accountType === "ADMIN") redirect("/dashboard/admin");
  const { paid } = await searchParams;

  if (!(await isEnabled("credits_enabled"))) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-bold md:text-3xl">Points</h1>
        <p className="text-ink/75">Points are not active yet. Everything on Floora-X is free for now.</p>
      </div>
    );
  }

  const [balance, packages, wallet] = await Promise.all([
    getBalance(user.id),
    db.creditPackage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.wallet.findUnique({
      where: { userId_type: { userId: user.id, type: "CLIENT_POINTS" } },
      include: { entries: { orderBy: { createdAt: "desc" }, take: 30 } },
    }),
  ]);
  const note = paid ? PAID[paid] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Points</h1>
        <p className="mt-2 text-ink/75">Use points for enquiries and other actions. Points never expire.</p>
      </div>

      {note && (
        <p className={`rounded-xl px-4 py-3 text-sm ${note.ok ? "bg-teal/10 text-navy" : "bg-amber/20 text-navy"}`}>
          {note.text}
        </p>
      )}

      <div className="rounded-2xl bg-navy p-6 text-white">
        <p className="text-sm text-white/70">Your balance</p>
        <p className="mt-1 text-4xl font-bold">{balance.toLocaleString("en-NG")} points</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Buy points</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p) => (
            <BuyPackage key={p.id} id={p.id} points={p.points} bonus={p.bonusPoints} priceNaira={p.priceNaira} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">History</h2>
        {!wallet || wallet.entries.length === 0 ? (
          <p className="text-sm text-ink/70">No activity yet.</p>
        ) : (
          <div className="divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
            {wallet.entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">
                    {REASON[e.reason]}
                    {e.action ? ` · ${ACTION[e.action] ?? e.action}` : ""}
                  </p>
                  <p className="text-xs text-ink/60">
                    {e.createdAt.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${e.amount > 0 ? "text-teal" : "text-navy"}`}>
                    {e.amount > 0 ? "+" : ""}{e.amount}
                  </p>
                  <p className="text-xs text-ink/60">Balance {e.balanceAfter}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}