"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondInspection, cancelInspection, markInspection } from "@/app/inspections/actions";

type Props = { id: string; canRespond: boolean; canCancel: boolean; canMark: boolean; min: string };
type Res = { ok: true } | { ok: false; error: string };

const field =
  "w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";
const btn = "rounded-full border px-4 py-1.5 text-xs font-semibold disabled:opacity-50";

export function InspectionActions({ id, canRespond, canCancel, canMark, min }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"none" | "counter" | "reject">("none");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function run(fn: () => Promise<Res>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error);
      setMode("none");
      setWhen("");
      setNote("");
      router.refresh();
    });
  }

  if (!canRespond && !canCancel && !canMark) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {canRespond && (
          <>
            <button disabled={pending} onClick={() => run(() => respondInspection(id, "ACCEPT"))} className={`${btn} border-teal bg-teal text-white`}>
              Accept
            </button>
            <button disabled={pending} onClick={() => setMode(mode === "counter" ? "none" : "counter")} className={`${btn} border-navy/15 text-navy hover:border-teal`}>
              Suggest another time
            </button>
            <button disabled={pending} onClick={() => setMode(mode === "reject" ? "none" : "reject")} className={`${btn} border-red-300 text-red-700 hover:bg-red-50`}>
              Decline
            </button>
          </>
        )}
        {canMark && (
          <>
            <button disabled={pending} onClick={() => run(() => markInspection(id, "COMPLETED"))} className={`${btn} border-teal bg-teal text-white`}>
              Mark as completed
            </button>
            <button disabled={pending} onClick={() => run(() => markInspection(id, "MISSED"))} className={`${btn} border-navy/15 text-navy hover:border-teal`}>
              Mark as missed
            </button>
          </>
        )}
        {canCancel && (
          <button
            disabled={pending}
            onClick={() => window.confirm("Cancel this inspection?") && run(() => cancelInspection(id))}
            className={`${btn} border-navy/15 text-navy hover:border-red-300`}
          >
            Cancel
          </button>
        )}
      </div>

      {mode === "counter" && (
        <div className="space-y-2 rounded-xl bg-mist p-3">
          <input type="datetime-local" min={min} value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Optional message" className={field} />
          <button
            disabled={pending || !when}
            onClick={() => run(() => respondInspection(id, "COUNTER", when, note))}
            className={`${btn} border-navy bg-navy text-white`}
          >
            Send new time
          </button>
        </div>
      )}

      {mode === "reject" && (
        <div className="space-y-2 rounded-xl bg-mist p-3">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Optional reason" className={field} />
          <button disabled={pending} onClick={() => run(() => respondInspection(id, "REJECT", undefined, note))} className={`${btn} border-red-300 bg-red-600 text-white`}>
            Decline request
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}