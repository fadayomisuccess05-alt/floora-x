import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export type Role = "CLIENT" | "LANDLORD" | "AGENT" | "AGENCY" | "ADMIN";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
});

// Use at the top of any protected page. Optionally restrict by role.
export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.accountStatus !== "ACTIVE") redirect("/login?message=suspended");
  if (roles && !roles.includes(user.accountType)) redirect("/dashboard");
  return user;
}