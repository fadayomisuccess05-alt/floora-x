import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { settlePayment } from "@/lib/points/settle";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", url));

  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref");
  const payment = reference ? await db.payment.findUnique({ where: { reference } }) : null;
  if (!reference || !payment || payment.userId !== user.id) {
    return NextResponse.redirect(new URL("/dashboard/points", url));
  }

  const result = await settlePayment(reference);
  return NextResponse.redirect(new URL(`/dashboard/points?paid=${result}`, url));
}