import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { markAllRead } from "./action";

const when = (d: Date) =>
  d.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Notifications</h1>
          <p className="mt-2 text-ink/75">{unread > 0 ? `${unread} unread` : "You are all caught up."}</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="rounded-full border border-navy/15 px-5 py-2 text-sm font-semibold text-navy hover:border-teal">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          Nothing here yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Link
              key={n.id}
              href={`/dashboard/notifications/${n.id}`}
              className={`block rounded-2xl border bg-white p-4 transition hover:border-teal ${
                n.readAt ? "border-navy/10" : "border-amber"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm ${n.readAt ? "font-semibold text-navy" : "font-bold text-navy"}`}>
                  {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber" />}
                  {n.title}
                </p>
                <span className="shrink-0 text-xs text-ink/60">{when(n.createdAt)}</span>
              </div>
              {n.body && <p className="mt-1 line-clamp-2 text-sm text-ink/75">{n.body}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}