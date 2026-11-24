import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ScrollToBottom } from "@/components/ScrollToBottom";
import { Composer } from "./Composer";

const stamp = (d: Date) =>
  d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const c = await db.conversation.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, title: true, listingStatus: true, city: true, state: true } },
      client: { select: { fullName: true, accountType: true } },
      recipient: { select: { fullName: true, accountType: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 500 },
    },
  });
  if (!c || (c.clientId !== user.id && c.recipientId !== user.id)) notFound();

  const iAmClient = c.clientId === user.id;
  const other = iAmClient ? c.recipient : c.client;

  // Opening the conversation marks it as read
  const update: { clientUnread?: boolean; recipientUnread?: boolean; status?: "READ" } = {};
  if (iAmClient && c.clientUnread) update.clientUnread = false;
  if (!iAmClient) {
    if (c.recipientUnread) update.recipientUnread = false;
    if (c.status === "NEW") update.status = "READ";
  }
  if (Object.keys(update).length > 0) {
    await db.conversation.update({ where: { id: c.id }, data: update });
  }

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={8} />
      <Link href="/dashboard/messages" className="text-sm font-semibold text-teal">&larr; All messages</Link>

      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="font-bold text-navy">
          {other.fullName} <span className="text-sm font-medium capitalize text-ink/60">&middot; {other.accountType.toLowerCase()}</span>
        </p>
        <p className="text-sm text-ink/70">
          About:{" "}
          {c.property.listingStatus === "PUBLISHED" ? (
            <Link href={`/property/${c.property.id}`} className="font-semibold text-teal hover:underline">{c.property.title}</Link>
          ) : (
            <span>{c.property.title} (no longer listed)</span>
          )}
        </p>
      </div>

      <div className="max-h-[55vh] min-h-[200px] space-y-3 overflow-y-auto rounded-2xl border border-navy/10 bg-white p-4">
        {c.messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "bg-navy text-white" : "bg-mist text-navy"}`}>
                <p className="whitespace-pre-line break-words text-sm">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-white/60" : "text-ink/50"}`}>{stamp(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <ScrollToBottom trigger={c.messages.length} />
      </div>

      <Composer conversationId={c.id} />
    </div>
  );
}