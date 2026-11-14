import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { roleSlug } from "@/lib/dashboard-nav";

export default async function DashboardIndex() {
  const user = await requireUser();
  redirect(`/dashboard/${roleSlug[user.accountType]}`);
}
