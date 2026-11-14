import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { roleSlug, roleLabel } from "@/lib/dashboard-nav";

export default async function RoleDashboard({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const user = await requireUser();

  // Each person can only see their own dashboard
  if (role !== roleSlug[user.accountType]) {
    redirect(`/dashboard/${roleSlug[user.accountType]}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-navy p-8 text-white">
        <h1 className="text-2xl font-bold !text-white md:text-3xl">Welcome, {user.fullName}</h1>
        <p className="mt-2 text-white/75">{roleLabel[user.accountType]} dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-navy/10 bg-white p-6">
          <h2 className="text-lg font-bold">Account status</h2>
          <p className="mt-2 text-sm text-ink/75">
            {user.accountStatus === "ACTIVE" ? "Active" : user.accountStatus}
          </p>
        </div>
        <div className="rounded-2xl border border-navy/10 bg-white p-6">
          <h2 className="text-lg font-bold">Verification</h2>
          <p className="mt-2 text-sm text-ink/75">Not started. Identity and address checks come next.</p>
        </div>
      </div>
    </div>
  );
}