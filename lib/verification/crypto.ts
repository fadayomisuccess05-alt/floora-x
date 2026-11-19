import "server-only";
import { createHmac, randomInt } from "node:crypto";

// Fingerprint of a NIN. We never store the NIN itself.
export function hashNin(nin: string) {
  return createHmac("sha256", process.env.VERIFICATION_HASH_SECRET!).update(nin).digest("hex");
}

export function maskNin(nin: string) {
  return "*******" + nin.slice(-4);
}

export function newChallengeCode() {
  return String(randomInt(1000, 10000)); // 4 digits
}