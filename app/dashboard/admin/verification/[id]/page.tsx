import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createAdminClient, VERIFICATION_BUCKET } from "@/lib/supabase/admin";
import { ReviewPanel } from "./ReviewPanel";

const KIND_LABEL: Record<string, string> = {
  NIN_CARD_FRONT: "NIN card, front",
  NIN_CARD_BACK: "NIN card, back",
  NIN_VIDEO: "Video",
  UTILITY_BILL: "Utility bill",
  CAC_CERT: "CAC certificate",
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser(["ADMIN"]);
  const { id } = await params;

  const v = await db.verification.findUnique({
    where: { id },
    include: { user: true, evidence: { orderBy: { createdAt: "asc" } } },
  });
  if (!v) notFound();

  if (v.status !== "PENDING") {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/admin/verification" className="text-sm font-semibold text-teal">&larr; Back to queue</Link>
        <h1 className="text-2xl font-bold">Already reviewed</h1>
        <p className="text-ink/75">
          Status: <strong>{v.status}</strong>
          {v.rejectionReason ? ` (${v.rejectionReason})` : ""}
        </p>
      </div>
    );
  }

  // Short-lived links: they stop working after 5 minutes
  const storage = createAdminClient().storage.from(VERIFICATION_BUCKET);
  const files = await Promise.all(
    v.evidence.map(async (e) => {
      const { data } = await storage.createSignedUrl(e.storageKey, 300);
      return { id: e.id, kind: e.kind, mime: e.mimeType ?? "", url: data?.signedUrl ?? null };
    })
  );

  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: "VERIFICATION_EVIDENCE_VIEWED",
      entityType: "Verification",
      entityId: v.id,
      newValues: { files: files.map((f) => f.kind) },
    },
  });

  return (
    <div className="space-y-6">
      <Link href="/dashboard/admin/verification" className="text-sm font-semibold text-teal">&larr; Back to queue</Link>

      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{v.type === "NIN" ? "ID check" : "Address check"}</h1>
        <p className="mt-1 text-ink/75">
          {v.user.fullName} &middot; {v.user.email} &middot; {v.user.phone ?? "no phone"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {files.map((f) => (
            <div key={f.id} className="rounded-2xl border border-navy/10 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-navy">{KIND_LABEL[f.kind] ?? f.kind}</p>
              {!f.url ? (
                <p className="text-sm text-red-600">Could not load this file.</p>
              ) : f.mime.startsWith("video/") ? (
                <video src={f.url} controls playsInline className="w-full rounded-xl bg-black" />
              ) : f.mime === "application/pdf" ? (
                <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold text-teal underline">
                  Open PDF in a new tab
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={KIND_LABEL[f.kind] ?? f.kind} className="w-full rounded-xl" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-navy/10 bg-white p-5 text-sm">
            <p><span className="text-ink/60">Account name:</span> <strong>{v.user.fullName}</strong></p>
            {v.maskedValue && <p className="mt-1"><span className="text-ink/60">NIN entered:</span> <strong>{v.maskedValue}</strong></p>}
            {v.challengeCode && <p className="mt-1"><span className="text-ink/60">Code shown:</span> <strong>{v.challengeCode}</strong></p>}
            {v.submittedAddress && <p className="mt-1"><span className="text-ink/60">Address entered:</span> <strong>{v.submittedAddress}</strong></p>}
          </div>

          <div className="rounded-2xl border border-navy/10 bg-white p-5">
            <ReviewPanel
              id={v.id}
              type={v.type}
              accountName={v.user.fullName}
              maskedNin={v.maskedValue}
              submittedAddress={v.submittedAddress}
              code={v.challengeCode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}