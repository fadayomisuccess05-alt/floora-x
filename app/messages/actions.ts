"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import { containsContactDetails } from "@/lib/messages/safety";

type Fail = { ok: false; error: string; needsLogin?: boolean };
const fail = (error: string, needsLogin = false): Fail => ({ ok: false, error, needsLogin });

const clean = (text: string) => text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

async function checkText(body: string, min: number, max: number): Promise<string | null> {
  if (body.length < min) return min > 1 ? `Write at least ${min} characters.` : "Write a message first.";
  if (body.length > max) return `Please keep it under ${max} characters.`;
  if ((await isEnabled("credits_enabled")) && containsContactDetails(body)) {
    return "Please don't share phone numbers, emails or links in messages.";
  }
  return null;
}

export async function startEnquiry(
  propertyId: string,
  message: string
): Promise<{ ok: true; conversationId: string; existing: boolean } | Fail> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in to send an enquiry.", true);
  if (user.accountType === "ADMIN") return fail("Administrator accounts can't send enquiries.");

  const body = clean(message);
  const problem = await checkText(body, 10, 1000);
  if (problem) return fail(problem);

  const p = await db.property.findFirst({
    where: { id: propertyId, listingStatus: "PUBLISHED" },
    select: { id: true, postedById: true, expiresAt: true },
  });
  if (!p || (p.expiresAt && p.expiresAt < new Date())) return fail("This property is no longer available.");
  if (p.postedById === user.id) return fail("This is your own listing.");

  const existing = await db.conversation.findUnique({
    where: { propertyId_clientId: { propertyId: p.id, clientId: user.id } },
    select: { id: true },
  });
  if (existing) return { ok: true, conversationId: existing.id, existing: true };

  const today = await db.conversation.count({
    where: { clientId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (today >= 20) return fail("You have sent many enquiries today. Please try again tomorrow.");

  // Points: when the points system is switched on, the enquiry charge is applied here (Stage 4b).

  const created = await db.$transaction(async (tx) => {
    const c = await tx.conversation.create({
      data: { propertyId: p.id, clientId: user.id, recipientId: p.postedById, recipientUnread: true, clientUnread: false },
    });
    await tx.message.create({ data: { conversationId: c.id, senderId: user.id, body } });
    await tx.auditLog.create({
      data: { actorId: user.id, action: "ENQUIRY_SENT", entityType: "Conversation", entityId: c.id, newValues: { propertyId: p.id } },
    });
    return c;
  });

  revalidatePath("/dashboard/messages");
  return { ok: true, conversationId: created.id, existing: false };
}

export async function sendMessage(conversationId: string, message: string): Promise<{ ok: true } | Fail> {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "ACTIVE") return fail("Log in to send a message.", true);

  const c = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, clientId: true, recipientId: true, status: true },
  });
  if (!c || (c.clientId !== user.id && c.recipientId !== user.id)) return fail("Conversation not found.");

  const body = clean(message);
  const problem = await checkText(body, 1, 2000);
  if (problem) return fail(problem);

  const recent = await db.message.count({
    where: { senderId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 12) return fail("You are sending messages too fast. Please wait a moment.");

  const iAmClient = c.clientId === user.id;
  await db.$transaction([
    db.message.create({ data: { conversationId: c.id, senderId: user.id, body } }),
    db.conversation.update({
      where: { id: c.id },
      data: {
        lastMessageAt: new Date(),
        clientUnread: !iAmClient,
        recipientUnread: iAmClient,
        ...(!iAmClient && (c.status === "NEW" || c.status === "READ") ? { status: "RESPONDED" as const } : {}),
      },
    }),
  ]);

  revalidatePath("/dashboard/messages");
  return { ok: true };
}