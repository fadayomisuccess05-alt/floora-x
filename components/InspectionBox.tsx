"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestInspection } from "@/app/inspections/actions";

type Props = {
  propertyId: string;
  mode: "guest" | "own" | "admin" | "ready" | "open";
  min: string;
  openText?: string;
  cost?: number;
  balance?: number;
};

const field =
  "w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

export function InspectionBox({ propertyId, mode, min, openText, cost = 0, balance = 0 }: Props) {
  const router = useRouter();
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [needsPoints, setNeedsPoints] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (mode === "own" || mode === "admin") return null;

  if (mode === "guest") {
    return (
      <div className="space-y-2 border-t border-navy/10 pt-4 text-sm text-ink/80">
        <p className="font-semibold text-navy">Request an inspection</p>
        <p>Log in to book a time to see this property.</p>
        <Link href="/login" className="inline-block rounded-full bg-navy px-4 py-2 text-xs font-bold text-white">Log in</Link>
      </div>
    );
  }

  if (mode === "open" || done) {
    return (
      <div className="space-y-2 border-t border-navy/10 pt-4 text-sm text-ink/80">
        <p className="font-semibold text-navy">Inspection</p>
        <p>{done ? "Request sent. You will be notified when the owner responds." : openText}</p>
        <Link href="/dashboard/inspections" className="font-semibold text-teal hover:underline">View my inspections</Link>
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNeedsPoints(false);
    setBusy(true);
    const res = await requestInspection(propertyId, when, note);
    setBusy(false);
    if (!res.ok) {
      if (res.needsLogin) return router.push("/login");
      if (res.code === "INSUFFICIENT_POINTS") setNeedsPoints(true);
      return setError(res.error);
    }
    setDone(true);
  }

  return (
    <form onSubmit={send} className="space-y-3 border-t border-navy/10 pt-4">
      <p className="text-sm font-semibold text-navy">Request an inspection</p>
      <input type="datetime-local" required min={min} value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
      <p className="text-xs text-ink/60">Nigerian time. Available between 7:00 am and 6:59 pm.</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="Optional note (for example, who will come with you)"
        className={field}
      />
      {cost > 0 && (
        <p className="text-xs text-ink/70">
          This request costs <strong>{cost} points</strong>. Your balance: <strong>{balance} points</strong>. Points are
          refunded if the owner declines, cancels or doesn&rsquo;t reply within 48 hours.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {needsPoints && (
        <Link href="/dashboard/points" className="inline-block rounded-full bg-navy px-4 py-2 text-xs font-bold text-white">
          Buy points
        </Link>
      )}
      <button
        type="submit"
        disabled={busy || !when}
        className="w-full rounded-full border border-navy px-5 py-2.5 text-sm font-bold text-navy hover:bg-navy hover:text-white disabled:opacity-50"
      >
        {busy ? "Sending..." : cost > 0 ? `Request inspection · ${cost} points` : "Request inspection"}
      </button>
    </form>
  );
}