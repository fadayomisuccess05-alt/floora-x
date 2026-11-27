import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const n = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return NextResponse.redirect(new URL("/dashboard/notifications", request.url));

  if (!n.readAt) await db.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });

  // Only ever go to a page on this site
  const safe = n.href && n.href.startsWith("/") && !n.href.startsWith("//") ? n.href : "/dashboard/notifications";
  return NextResponse.redirect(new URL(safe, request.url));
}