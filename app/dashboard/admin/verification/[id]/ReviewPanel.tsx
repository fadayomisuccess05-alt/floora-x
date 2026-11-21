"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveVerification, rejectVerification } from "../actions";

type Props = {
  id: string;
  type: "NIN" | "ADDRESS" | "CAC";
  accountName: string;
  maskedNin: string | null;
  submittedAddress: string | null;
  code: string | null;
};

const REASONS: Record<string, string[]> = {
  NIN: [
    "The card photo is blurry or unreadable",
    "Your face is not clearly visible in the video",
    "The name on the card does not match your account name",
    "The NIN on the card does not match the number you entered",
    "The code you said does not match the code shown",
    "The card looks altered or incomplete",
    "The video does not look live",
    "Other",
  ],
  ADDRESS: [
    "The bill is older than 3 months",
    "The name on the bill does not match your verified ID",
    "The address on the bill does not match the address you entered",
    "The document is not a utility bill",
    "The document is unreadable",
    "Other",
  ],
  CAC: ["The document is unreadable", "Other"],
};

function checklist(p: Props): string[] {
  if (p.type === "NIN") {
    return [
      "The face in the video matches the photo on the card",
      `The name on the card matches the account name: ${p.accountName}`,
      `The NIN on the card matches the number entered (${p.maskedNin ?? "hidden"})`,
      `The person says the code ${p.code ?? ""} in the video`,
      "The card is clear, uncovered and looks genuine",
      "The video looks live (not a screen or a printed photo)",
    ];
  }
  return [
    `The name on the bill matches the verified ID name: ${p.accountName}`,
    `The address on the bill matches: ${p.submittedAddress ?? ""}`,
    "The bill is dated within the last 3 months",
    "It is an electricity, water or waste bill and looks genuine",
  ];
}

export function ReviewPanel(props: Props) {
  const router = useRouter();
  const list = checklist(props);
  const [checked, setChecked] = useState<boolean[]>(list.map(() => false));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const allChecked = checked.every(Boolean);
  const reasons = REASONS[props.type] ?? REASONS.CAC;

  async function approve() {
    setBusy(true);
    setError("");
    const res = await approveVerification(props.id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/dashboard/admin/verification");
    router.refresh();
  }

  async function reject() {
    if (!reason) return setError("Choose a reason.");
    if (reason === "Other" && note.trim().length < 3) return setError("Describe the problem in the note.");
    setBusy(true);
    setError("");
    const text = note.trim() ? `${reason}. ${note.trim()}` : reason;
    const res = await rejectVerification(props.id, text);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/dashboard/admin/verification");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-bold text-navy">Checklist (all required to approve)</h3>
        {list.map((item, i) => (
          <label key={item} className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={(e) => setChecked(checked.map((c, j) => (j === i ? e.target.checked : c)))}
              className="mt-1"
            />
            {item}
          </label>
        ))}
        <button
          onClick={approve}
          disabled={busy || !allChecked}
          className="w-full rounded-full bg-teal px-6 py-3 font-bold text-white disabled:opacity-40"
        >
          {busy ? "Saving..." : "Approve"}
        </button>
      </div>

      <div className="space-y-3 border-t border-navy/10 pt-6">
        <h3 className="font-bold text-navy">Reject</h3>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy"
        >
          <option value="">Choose a reason</option>
          {reasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note for the user"
          className="w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy"
        />
        <button
          onClick={reject}
          disabled={busy}
          className="w-full rounded-full border border-red-300 px-6 py-3 font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          Reject
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}