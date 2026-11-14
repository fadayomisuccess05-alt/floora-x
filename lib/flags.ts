import { db } from "@/lib/db";

export async function isEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? false;
}