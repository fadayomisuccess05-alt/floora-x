"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/auth/types";

const schema = z.object({
  // ADMIN is deliberately not allowed here
  accountType: z.enum(["CLIENT", "LANDLORD", "AGENT", "AGENCY"]),
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number"),
  password: z.string().min(8, "At least 8 characters").max(72),
  state: z.string().trim().min(1, "Choose your state").max(50),
  city: z.string().trim().min(1, "Enter your city").max(60),
  agencyName: z.string().trim().max(120).optional(),
});

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { accountType, fullName, email, phone, password, state, city, agencyName } = parsed.data;

  if (accountType === "AGENCY" && !agencyName) {
    return { error: "Enter your agency name.", fieldErrors: { agencyName: ["Required"] } };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };

  const user = data.user;
  if (!user) return { error: "Could not create your account. Please try again." };
  if (user.identities?.length === 0) {
    return { error: "An account with this email already exists. Try logging in." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.create({
        data: { id: user.id, fullName, email, phone, accountType, state, city },
      });
      if (accountType === "AGENT") {
        await tx.agentProfile.create({ data: { userId: user.id } });
      }
      if (accountType === "LANDLORD") {
        await tx.landlordProfile.create({ data: { userId: user.id } });
      }
      if (accountType === "AGENCY") {
        const agency = await tx.agency.create({
          data: {
            name: agencyName!,
            companyEmail: email,
            companyPhone: phone,
            state,
            city,
            ownerUserId: user.id,
          },
        });
        await tx.agencyMembership.create({
          data: {
            agencyId: agency.id,
            userId: user.id,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "USER_REGISTERED",
          entityType: "User",
          entityId: user.id,
          newValues: { accountType },
        },
      });
    });
  } catch (e) {
    console.error("Registration database error:", e);
    return {
      error:
        "We could not finish creating your account. If this phone number or email is already registered, try logging in.",
    };
  }

  redirect("/register/check-email");
}