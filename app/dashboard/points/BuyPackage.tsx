"use client";

import { useState } from "react";
import { startTopup } from "./actions";

export function BuyPackage({ id, points, bonus, priceNaira }: { id: string; points: number; bonus: number; priceNaira: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setError("");
    setBusy(true);
    const res = await startTopup(id);
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    window.location.href = res.url;
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <p className="text-2xl font-bold text-navy">{points.toLocaleString("en-NG")} points</p>
      {bonus > 0 && <p className="text-sm font-semibold text-teal">+ {bonus.toLocaleString("en-NG")} bonus</p>}
      <p className="mt-1 text-sm text-ink/70">₦{priceNaira.toLocaleString("en-NG")}</p>
      <button
        onClick={buy}
        disabled={busy}
        className="mt-4 w-full rounded-full bg-amber px-5 py-2.5 text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Opening payment..." : "Buy"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}