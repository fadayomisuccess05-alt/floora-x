"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveListing, rejectListing } from "../actions";

const CHECKLIST = [
  "The photos show a real property, not stock or copied images",
  "The title, category and sale/rent type match the photos and description",
  "The price looks realistic for the area",
  "The location details are consistent",
  "The text contains no phone numbers, emails or links",
  "The poster is verified (ID Checked) and the details look genuine",
];

const REASONS = [
  "The photos are unclear or do not show the property",
  "The photos look copied or are not of this property",
  "The price looks unrealistic",
  "The description or details are incomplete or inconsistent",
  "The listing contains contact details (phone, email or links)",
  "This looks like a duplicate listing",
  "Other",
];

export function ListingReview({ id }: { id: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    setError("");
    const res = await approveListing(id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/dashboard/admin/listings");
    router.refresh();
  }

  async function reject() {
    if (!reason) return setError("Choose a reason.");
    if (reason === "Other" && note.trim().length < 3)
      return setError("Describe the problem in the note.");
    setBusy(true);
    setError("");
    const res = await rejectListing(
      id,
      note.trim() ? `${reason}. ${note.trim()}` : reason,
    );
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/dashboard/admin/listings");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-bold text-navy">
          Checklist (all required to approve)
        </h3>
        {CHECKLIST.map((item, i) => (
          <label key={item} className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked[i]}
              onChange={(e) =>
                setChecked(
                  checked.map((c, j) => (j === i ? e.target.checked : c)),
                )
              }
            />
            {item}
          </label>
        ))}
        <button
          onClick={approve}
          disabled={busy || !checked.every(Boolean)}
          className="w-full rounded-full bg-teal px-6 py-3 font-bold text-white disabled:opacity-40"
        >
          {busy ? "Saving..." : "Approve and publish"}
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
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note for the poster"
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

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
