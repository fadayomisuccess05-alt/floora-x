import { requireUser } from "@/lib/auth/session";
import { getNav, roleLabel } from "@/lib/dashboard-nav";
import { isEnabled } from "@/lib/flags";
import { unreadCount } from "@/lib/messages/unread";
import { DashboardNav } from "./DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread, creditsOn] = await Promise.all([unreadCount(user.id), isEnabled("credits_enabled")]);

  const nav = getNav(user.accountType).map((i) => (i.label === "Messages" ? { ...i, badge: unread } : i));
  if (creditsOn && user.accountType !== "ADMIN") {
    const at = nav.findIndex((i) => i.label === "Messages");
    nav.splice(at >= 0 ? at + 1 : nav.length, 0, { label: "Points", href: "/dashboard/points" });
  }

  return (
    <div className="mx-auto max-w-7xl md:flex md:gap-6 md:px-4 md:py-8">
      <DashboardNav items={nav} name={user.fullName} role={roleLabel[user.accountType]} />
      <section className="min-w-0 flex-1 px-4 py-6 md:px-0 md:py-0">{children}</section>
    </div>
  );
}