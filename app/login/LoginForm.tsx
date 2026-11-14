"use client";

import { useActionState } from "react";
import { login } from "./actions";
import type { FormState } from "@/lib/auth/types";

const input =
  "w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-navy">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-navy">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className={input} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber px-6 py-3.5 font-bold text-navy transition hover:scale-[1.01] disabled:opacity-60"
      >
        {pending ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}