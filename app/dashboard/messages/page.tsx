import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { publicMediaUrl } from "@/lib/properties/media";

const STATUS: Record<string, string> = {
  NEW: "New",
  READ: "Seen",
  RESPONDED: "Replied",
  CLOSED: "Closed",
};

const when = (d: Date) =>
  d.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

export default async function MessagesPage() {
  const user = await requireUser();

  const items = await db.conversation.findMany({
    where: { OR: [{ clientId: user.id }, { recipientId: user.id }] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      property: { select: { title: true, media: { where: { isCover: true }, take: 1 } } },
      client: { select: { fullName: true } },
      recipient: { select: { fullName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderId: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Messages</h1>
        <p className="mt-2 text-ink/75">Enquiries and conversations about properties.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-ink/75">
          No messages yet.{" "}
          <Link href="/buy" className="font-semibold text-teal hover:underline">Browse properties</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const iAmClient = c.clientId === user.id;
            const other = iAmClient ? c.recipient.fullName : c.client.fullName;
            const unread = iAmClient ? c.clientUnread : c.recipientUnread;
            const last = c.messages[0];
            const cover = c.property.media[0];
            return (
              <Link
                key={c.id}
                href={`/dashboard/messages/${c.id}`}
                className={`flex gap-4 rounded-2xl border bg-white p-4 transition hover:border-teal ${
                  unread ? "border-amber" : "border-navy/10"
                }`}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(cover.storageKey)} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-20 shrink-0 rounded-xl bg-mist" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bold text-navy">{other}</p>
                    <span className="shrink-0 text-xs text-ink/60">{when(c.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-sm text-ink/70">{c.property.title}</p>
                  <p className={`mt-1 truncate text-sm ${unread ? "font-semibold text-navy" : "text-ink/70"}`}>
                    {last ? `${last.senderId === user.id ? "You: " : ""}${last.body}` : ""}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {unread && <span className="rounded-full bg-amber px-2 py-0.5 font-bold text-navy">New message</span>}
                    {!iAmClient && (
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 font-semibold text-navy">{STATUS[c.status]}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}