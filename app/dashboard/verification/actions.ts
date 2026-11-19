"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createAdminClient, VERIFICATION_BUCKET } from "@/lib/supabase/admin";
import { hashNin, maskNin, newChallengeCode } from "@/lib/verification/crypto";

type Fail = { ok: false; error: string };
const MAX_ATTEMPTS_PER_DAY = 3;

const REQUIRED: Record<string, string[]> = {
  NIN: ["NIN_CARD_FRONT", "NIN_VIDEO"],
  ADDRESS: ["UTILITY_BILL"],
};
const ALLOWED: Record<string, string[]> = {
  NIN: ["NIN_CARD_FRONT", "NIN_CARD_BACK", "NIN_VIDEO"],
  ADDRESS: ["UTILITY_BILL"],
};

const IMAGE = ["image/jpeg", "image/png", "image/webp"];
const VIDEO = ["video/webm", "video/mp4", "video/quicktime"];

function mimeOk(kind: string, mime: string) {
  if (kind === "NIN_VIDEO") return VIDEO.includes(mime);
  if (kind === "UTILITY_BILL") return [...IMAGE, "application/pdf"].includes(mime);
  return IMAGE.includes(mime);
}
function sizeOk(kind: string, size: number) {
  const max = kind === "NIN_VIDEO" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
  return size > 0 && size <= max;
}
function extFor(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
    "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov",
  };
  return map[mime] ?? "bin";
}
async function attemptsToday(userId: string, type: "NIN" | "ADDRESS") {
  return db.verification.count({
    where: { userId, type, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}

export async function startNin(
  ninInput: string
): Promise<{ ok: true; verificationId: string; challengeCode: string } | Fail> {
  const user = await requireUser();
  if (user.accountType === "ADMIN") return { ok: false, error: "Not available for administrator accounts." };

  const nin = ninInput.replace(/\s/g, "");
  if (!/^\d{11}$/.test(nin)) return { ok: false, error: "A NIN has exactly 11 digits." };

  const verified = await db.verification.findFirst({ where: { userId: user.id, type: "NIN", status: "VERIFIED" } });
  if (verified) return { ok: false, error: "Your identity is already verified." };

  const valueHash = hashNin(nin);
  const clash = await db.verification.findFirst({
    where: { type: "NIN", valueHash, userId: { not: user.id }, status: { in: ["VERIFIED", "PENDING"] } },
  });
  if (clash) {
    return { ok: false, error: "This NIN is already linked to another Floora-X account. Contact support if this is a mistake." };
  }

  const challengeCode = newChallengeCode();
  const unfinished = await db.verification.findFirst({
    where: { userId: user.id, type: "NIN", status: "PENDING", evidence: { none: {} } },
  });
  if (unfinished) {
    await db.verification.update({
      where: { id: unfinished.id },
      data: { valueHash, maskedValue: maskNin(nin), challengeCode },
    });
    return { ok: true, verificationId: unfinished.id, challengeCode };
  }

  if ((await attemptsToday(user.id, "NIN")) >= MAX_ATTEMPTS_PER_DAY) {
    return { ok: false, error: "Too many attempts today. Please try again tomorrow." };
  }

  const created = await db.verification.create({
    data: { userId: user.id, type: "NIN", valueHash, maskedValue: maskNin(nin), challengeCode },
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: "VERIFICATION_STARTED", entityType: "Verification", entityId: created.id, newValues: { type: "NIN" } },
  });
  return { ok: true, verificationId: created.id, challengeCode };
}

export async function startAddress(
  addressInput: string
): Promise<{ ok: true; verificationId: string } | Fail> {
  const user = await requireUser();
  if (user.accountType === "ADMIN") return { ok: false, error: "Not available for administrator accounts." };

  const ninDone = await db.verification.findFirst({ where: { userId: user.id, type: "NIN", status: "VERIFIED" } });
  if (!ninDone) return { ok: false, error: "Complete ID verification first." };

  const address = addressInput.trim();
  if (address.length < 10 || address.length > 250) {
    return { ok: false, error: "Enter your full address as it appears on the bill." };
  }

  const current = await db.verification.findFirst({
    where: { userId: user.id, type: "ADDRESS", status: "VERIFIED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (current) return { ok: false, error: "Your address is already verified." };

  const unfinished = await db.verification.findFirst({
    where: { userId: user.id, type: "ADDRESS", status: "PENDING", evidence: { none: {} } },
  });
  if (unfinished) {
    await db.verification.update({ where: { id: unfinished.id }, data: { submittedAddress: address } });
    return { ok: true, verificationId: unfinished.id };
  }

  if ((await attemptsToday(user.id, "ADDRESS")) >= MAX_ATTEMPTS_PER_DAY) {
    return { ok: false, error: "Too many attempts today. Please try again tomorrow." };
  }

  const created = await db.verification.create({
    data: { userId: user.id, type: "ADDRESS", submittedAddress: address },
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: "VERIFICATION_STARTED", entityType: "Verification", entityId: created.id, newValues: { type: "ADDRESS" } },
  });
  return { ok: true, verificationId: created.id };
}

export async function getUploadUrls(
  verificationId: string,
  files: { kind: string; mime: string; size: number }[]
): Promise<{ ok: true; bucket: string; items: { kind: string; path: string; token: string }[] } | Fail> {
  const user = await requireUser();
  const v = await db.verification.findFirst({ where: { id: verificationId, userId: user.id, status: "PENDING" } });
  if (!v || !ALLOWED[v.type]) return { ok: false, error: "Verification not found." };

  const admin = createAdminClient();
  const items: { kind: string; path: string; token: string }[] = [];

  for (const f of files) {
    if (!ALLOWED[v.type].includes(f.kind) || !mimeOk(f.kind, f.mime) || !sizeOk(f.kind, f.size)) {
      return { ok: false, error: "One of the files is the wrong type or too large." };
    }
    const path = `${user.id}/${v.id}/${f.kind}-${randomUUID()}.${extFor(f.mime)}`;
    const { data, error } = await admin.storage.from(VERIFICATION_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: "Could not prepare the upload. Please try again." };
    items.push({ kind: f.kind, path, token: data.token });
  }
  return { ok: true, bucket: VERIFICATION_BUCKET, items };
}

export async function finalizeVerification(verificationId: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  const v = await db.verification.findFirst({ where: { id: verificationId, userId: user.id, status: "PENDING" } });
  if (!v || !REQUIRED[v.type]) return { ok: false, error: "Verification not found." };

  // Check what is really in storage. We don't trust the browser's word.
  const admin = createAdminClient();
  const prefix = `${user.id}/${v.id}`;
  const { data: objects, error } = await admin.storage.from(VERIFICATION_BUCKET).list(prefix, { limit: 100 });
  if (error || !objects) return { ok: false, error: "Could not check your upload. Please try again." };

  const newest = new Map<string, { name: string; size: number; mime: string; created: string }>();
  for (const o of objects) {
    const kind = o.name.split("-")[0];
    if (!ALLOWED[v.type].includes(kind)) continue;
    const created = o.created_at ?? "";
    const prev = newest.get(kind);
    if (!prev || created > prev.created) {
      newest.set(kind, {
        name: o.name,
        size: Number(o.metadata?.size ?? 0),
        mime: String(o.metadata?.mimetype ?? ""),
        created,
      });
    }
  }

  for (const kind of REQUIRED[v.type]) {
    if (!newest.has(kind)) return { ok: false, error: "A required file is missing. Please upload it again." };
  }
  for (const [kind, f] of newest) {
    if (!mimeOk(kind, f.mime) || !sizeOk(kind, f.size)) {
      return { ok: false, error: "A file was rejected (wrong type or too large). Please upload it again." };
    }
  }

  await db.$transaction([
    db.verificationEvidence.deleteMany({ where: { verificationId: v.id } }),
    db.verificationEvidence.createMany({
      data: [...newest.entries()].map(([kind, f]) => ({
        verificationId: v.id,
        kind,
        storageKey: `${prefix}/${f.name}`,
        mimeType: f.mime,
        sizeBytes: f.size,
      })),
    }),
    db.auditLog.create({
      data: { actorId: user.id, action: "VERIFICATION_SUBMITTED", entityType: "Verification", entityId: v.id, newValues: { type: v.type } },
    }),
  ]);

  revalidatePath("/dashboard/verification");
  return { ok: true };
}