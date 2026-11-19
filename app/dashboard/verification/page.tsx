import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NinFlow } from "./NinFlow";
import { AddressFlow } from "./AddressFlow";

type UiStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

async function summary(userId: string, type: "NIN" | "ADDRESS") {
  const v = await db.verification.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { evidence: true } } },
  });
  if (!v || (v.status === "PENDING" && v._count.evidence === 0)) {
    return { status: "NONE" as UiStatus, reason: null, masked: null };
  }
  const expired = v.status === "VERIFIED" && v.expiresAt && v.expiresAt < new Date();
  return {
    status: (expired ? "EXPIRED" : v.status) as UiStatus,
    reason: v.rejectionReason,
    masked: v.maskedValue,
  };
}

export default async function VerificationPage() {
  const user = await requireUser();
  if (user.accountType === "ADMIN") redirect("/dashboard/admin");

  const [nin, address] = await Promise.all([summary(user.id, "NIN"), summary(user.id, "ADDRESS")]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Verification</h1>
        <p className="mt-2 max-w-2xl text-ink/75">
          Verified profiles earn more trust from clients, agents and landlords. Premium membership never replaces
          verification.
        </p>
      </div>

      <section className="rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="text-xl font-bold">ID Checked</h2>
        <div className="mt-4">
          <NinFlow status={nin.status} reason={nin.reason} masked={nin.masked} />
        </div>
      </section>

      <section className="rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="text-xl font-bold">Address Verified</h2>
        <div className="mt-4">
          <AddressFlow status={address.status} reason={address.reason} ninVerified={nin.status === "VERIFIED"} />
        </div>
      </section>
    </div>
  );
}