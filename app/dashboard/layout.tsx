import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getNav, roleLabel } from "@/lib/dashboard-nav";
import { logout } from "@/app/login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = getNav(user.accountType);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-64 md:shrink-0">
        <div className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="truncate font-bold text-navy">{user.fullName}</p>
          <p className="text-sm font-medium text-teal">{roleLabel[user.accountType]}</p>
        </div>

        <nav aria-label="Dashboard" className="mt-4 flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
          {nav.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-navy/50"
              >
                {item.label}
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Soon
                </span>
              </span>
            )
          )}
        </nav>

        <form action={logout} className="mt-4">
          <button className="w-full rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-white">
            Log out
          </button>
        </form>
      </aside>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}