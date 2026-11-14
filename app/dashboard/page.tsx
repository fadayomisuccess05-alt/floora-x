import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logout } from "@/app/login/actions";

const labels = {
  CLIENT: "Property seeker",
  LANDLORD: "Landlord",
  AGENT: "Agent",
  AGENCY: "Agency",
  ADMIN: "Administrator",
} as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Hello, {user.fullName}</h1>
      <p className="mt-2 text-ink/75">
        You are signed in as: <strong>{labels[user.accountType]}</strong>
      </p>
      <p className="mt-1 text-sm text-ink/60">
        Role dashboards are built next. This page proves that sign-up, login and your database record work.
      </p>
      <form action={logout} className="mt-8">
        <button className="rounded-full border border-navy/20 px-6 py-2.5 font-semibold text-navy hover:bg-white">
          Log out
        </button>
      </form>
    </div>
  );
}