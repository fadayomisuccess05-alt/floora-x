"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAlert } from "@/app/alerts/actions";

export type AlertPayload = {
  purpose: "BUY" | "RENT" | null;
  categoryGroup: "RESIDENTIAL" | "COMMERCIAL" | "LAND" | null;
  categorySlug: string | null;
  q: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  amenitySlugs: string[];
};

export function SaveSearchButton({ payload, loggedIn }: { payload: AlertPayload; loggedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function click() {
    if (!loggedIn) return router.push("/login");
    setError("");
    start(async () => {
      const res = await createAlert(payload);
      if (res.ok) return setDone(true);
      if (res.needsLogin) return router.push("/login");
      setError(res.error);
    });
  }

  if (done) {
    return (
      <p className="text-sm font-semibold text-teal">
        Alert saved.{" "}
        <Link href="/dashboard/alerts" className="underline">Manage alerts</Link>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className="rounded-full border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/10 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Alert me about new matches"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}