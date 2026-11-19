import "server-only";
import { createClient } from "@supabase/supabase-js";

export const VERIFICATION_BUCKET = "verification-private";

// Uses the SECRET key. Only import this from server code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
