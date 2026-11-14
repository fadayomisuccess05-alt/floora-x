"use client";

import { useActionState, useState } from "react";
import { register } from "./actions";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import type { FormState } from "@/lib/auth/types";

const roles = [
  { value: "CLIENT", title: "Property seeker", text: "Buy or rent a property" },
  { value: "LANDLORD", title: "Landlord / owner", text: "List your property for free" },
  { value: "AGENT", title: "Independent agent", text: "Grow your agent business" },
  { value: "AGENCY", title: "Real estate agency", text: "Manage a team and listings" },
];

const input =
  "w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy placeholder:text-navy/40 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

function Field({
  label, name, errors, children,
}: {
  label: string;
  name: string;
  errors?: Record<string, string[] | undefined>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {errors?.[name]?.[0] && <p className="mt-1 text-sm text-red-600">{errors[name]![0]}</p>}
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const [role, setRole] = useState("CLIENT");
  const errs = state.fieldErrors;

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">I am a...</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <label key={r.value} className="cursor-pointer">
              <input
                type="radio"
                name="accountType"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="peer sr-only"
              />
              <div className="rounded-xl border-2 border-navy/10 bg-white p-4 transition peer-checked:border-teal peer-checked:bg-teal/5 peer-focus-visible:ring-2 peer-focus-visible:ring-teal">
                <div className="font-bold text-navy">{r.title}</div>
                <div className="text-sm text-ink/70">{r.text}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {role === "AGENCY" && (
        <Field label="Agency name" name="agencyName" errors={errs}>
          <input id="agencyName" name="agencyName" className={input} placeholder="e.g. Delta Homes Ltd" />
        </Field>
      )}

      <Field label="Full name" name="fullName" errors={errs}>
        <input id="fullName" name="fullName" autoComplete="name" className={input} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" errors={errs}>
          <input id="email" name="email" type="email" autoComplete="email" className={input} />
        </Field>
        <Field label="Phone number" name="phone" errors={errs}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="08012345678" className={input} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="State" name="state" errors={errs}>
          <select id="state" name="state" defaultValue="" className={input}>
            <option value="" disabled>Select state</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="City" name="city" errors={errs}>
          <input id="city" name="city" autoComplete="address-level2" className={input} />
        </Field>
      </div>
      <Field label="Password" name="password" errors={errs}>
        <input id="password" name="password" type="password" autoComplete="new-password" className={input} />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber px-6 py-3.5 font-bold text-navy transition hover:scale-[1.01] disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}