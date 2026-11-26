"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFlag, saveActionPrice, savePackage } from "./actions";

const box =
  "w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setMsg("");
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? "Saved" : res.error);
      if (res.ok) router.refresh();
    });
  }
  return { pending, msg, run };
}

export function FlagToggle({
  flagKey,
  label,
  description,
  enabled,
  locked,
}: {
  flagKey: string;
  label: string;
  description: string;
  enabled: boolean;
  locked: boolean;
}) {
  const { pending, msg, run } = useSave();

  function toggle() {
    const next = !enabled;
    if (next && !window.confirm(`Switch ON "${label}"? This affects all users immediately.`)) return;
    if (!next && !window.confirm(`Switch OFF "${label}"?`)) return;
    run(() => setFlag(flagKey, next));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy/10 bg-white p-4">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-navy">{label}</p>
        <p className="text-sm text-ink/70">{description}</p>
        {msg && <p className="mt-1 text-xs text-teal">{msg}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-teal/15 text-teal" : "bg-navy/10 text-navy"}`}>
          {enabled ? "ON" : "OFF"}
        </span>
        {locked ? (
          <span className="text-xs text-ink/50">Available in a later stage</span>
        ) : (
          <button
            onClick={toggle}
            disabled={pending}
            className="rounded-full border border-navy/20 px-4 py-1.5 text-xs font-semibold text-navy hover:border-teal disabled:opacity-50"
          >
            {enabled ? "Switch off" : "Switch on"}
          </button>
        )}
      </div>
    </div>
  );
}

export function PriceRow({ action, label, points, active }: { action: string; label: string; points: number; active: boolean }) {
  const { pending, msg, run } = useSave();
  const [p, setP] = useState(String(points));
  const [a, setA] = useState(active);

  return (
    <div className="grid items-center gap-3 rounded-xl border border-navy/10 bg-white p-4 sm:grid-cols-[1fr_120px_90px_auto]">
      <div>
        <p className="font-semibold text-navy">{label}</p>
        <p className="text-xs text-ink/50">{action}</p>
      </div>
      <input className={box} inputMode="numeric" value={p} onChange={(e) => setP(e.target.value.replace(/\D/g, ""))} aria-label="Points" />
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} /> Active
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => run(() => saveActionPrice(action, parseInt(p || "0", 10), a))}
          disabled={pending}
          className="rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
        {msg && <span className="text-xs text-teal">{msg}</span>}
      </div>
    </div>
  );
}

export function PackageRow({
  id,
  points,
  priceNaira,
  bonusPoints,
  active,
}: {
  id: string | null;
  points: number;
  priceNaira: number;
  bonusPoints: number;
  active: boolean;
}) {
  const { pending, msg, run } = useSave();
  const [pts, setPts] = useState(String(points));
  const [price, setPrice] = useState(String(priceNaira));
  const [bonus, setBonus] = useState(String(bonusPoints));
  const [a, setA] = useState(active);
  const isNew = id === null;

  return (
    <div className="grid items-end gap-3 rounded-xl border border-navy/10 bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_90px_auto]">
      <label className="text-xs text-ink/60">Points
        <input className={`${box} mt-1`} inputMode="numeric" value={pts} onChange={(e) => setPts(e.target.value.replace(/\D/g, ""))} />
      </label>
      <label className="text-xs text-ink/60">Price (₦)
        <input className={`${box} mt-1`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
      </label>
      <label className="text-xs text-ink/60">Bonus points
        <input className={`${box} mt-1`} inputMode="numeric" value={bonus} onChange={(e) => setBonus(e.target.value.replace(/\D/g, ""))} />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-ink">
        <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} /> Active
      </label>
      <div className="flex items-center gap-3 pb-1">
        <button
          onClick={() =>
            run(() =>
              savePackage(id, {
                points: parseInt(pts || "0", 10),
                priceNaira: parseInt(price || "0", 10),
                bonusPoints: parseInt(bonus || "0", 10),
                active: a,
              })
            )
          }
          disabled={pending}
          className="rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {isNew ? "Add" : "Save"}
        </button>
        {msg && <span className="text-xs text-teal">{msg}</span>}
      </div>
    </div>
  );
}