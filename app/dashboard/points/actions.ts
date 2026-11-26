"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import { initializeTransaction } from "@/lib/paystack";

export async function startTopup(packageId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await requireUser();
  if (user.accountType === "ADMIN") return { ok: false, error: "Administrator accounts don't use points." };
  if (!(await isEnabled("credits_enabled"))) return { ok: false, error: "Points are not active yet." };

  // The price always comes from our database, never from the browser
  const pkg = await db.creditPackage.findFirst({ where: { id: packageId, active: true } });
  if (!pkg) return { ok: false, error: "This package is no longer available." };

  const reference = `fx_${randomUUID().replace(/-/g, "")}`;
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      amountNaira: pkg.priceNaira,
      reference,
      packageId: pkg.id,
      points: pkg.points,
      bonusPoints: pkg.bonusPoints,
    },
  });

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  try {
    const init = await initializeTransaction({
      email: user.email,
      amountKobo: pkg.priceNaira * 100,
      reference,
      callbackUrl: `${origin}/dashboard/points/verify`,
      metadata: { paymentId: payment.id, userId: user.id },
    });
    return { ok: true, url: init.authorization_url };
  } catch (e) {
    console.error("Paystack initialize failed:", e instanceof Error ? e.message : e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { ok: false, error: "We could not start the payment. Please try again." };
  }
}