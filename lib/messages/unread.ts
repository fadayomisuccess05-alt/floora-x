import "server-only";
import { db } from "@/lib/db";

export async function unreadCount(userId: string) {
  return db.conversation.count({
    where: {
      OR: [
        { clientId: userId, clientUnread: true },
        { recipientId: userId, recipientUnread: true },
      ],
    },
  });
}