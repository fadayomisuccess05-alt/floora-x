"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAlert, deleteAlert } from "@/app/alerts/actions";

export function AlertRow({ id, label, active, created }: { id: string; label: string; active: boolean; created: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white p-4">
      <div className="min-w-0">
        <p className="font-bold text-navy">{label}</p>
        <p className="text-xs text-ink/60">
          Created {created} &middot;{" "}
          <span className={active ? "font-semibold text-teal" : "font-semibold text-ink/60"}>
            {active ? "On" : "Paused"}
          </span>
        </p>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => toggleAlert(id))}
          className="rounded-full border border-navy/15 px-4 py-1.5 text-xs font-semibold text-navy hover:border-teal disabled:opacity-50"
        >
          {active ? "Pause" : "Turn on"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => window.confirm("Delete this alert?") && run(() => deleteAlert(id))}
          className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}