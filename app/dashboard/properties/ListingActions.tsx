"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { manageListing } from "./manage-actions";

type Props = {
  id: string;
  status: string;
  expired: boolean;
  transactionType: string;
  everPublished: boolean;
};

export function ListingActions({ id, status, expired, transactionType, everPublished }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function run(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError("");
    start(async () => {
      const res = await manageListing(id, action);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const doneWord = transactionType === "FOR_SALE" ? "sold" : "rented";
  const editable = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"].includes(status);
  const buttons: { label: string; action: string; confirm?: string; danger?: boolean }[] = [];

  if (status === "PUBLISHED" && !expired) {
    buttons.push({ label: `Mark as ${doneWord}`, action: "MARK_DONE", confirm: `Mark this property as ${doneWord}? It will be removed from search.` });
    buttons.push({ label: "Renew", action: "RENEW" });
    buttons.push({ label: "Take down", action: "TAKE_DOWN", confirm: "Take this listing down?" });
  } else if (status === "PUBLISHED" && expired) {
    buttons.push({ label: "Renew", action: "RENEW" });
    buttons.push({ label: `Mark as ${doneWord}`, action: "MARK_DONE" });
  } else if (status === "PENDING_REVIEW") {
    buttons.push({ label: "Withdraw", action: "TAKE_DOWN", confirm: "Withdraw this listing from review?" });
  } else if (status === "RESERVED") {
    buttons.push({ label: `Mark as ${doneWord}`, action: "MARK_DONE" });
    buttons.push({ label: "Make available again", action: "RELIST" });
  } else if (["RENTED", "SOLD", "EXPIRED", "ARCHIVED"].includes(status) && everPublished) {
    buttons.push({ label: status === "RENTED" || status === "SOLD" ? "Make available again" : "Relist", action: "RELIST" });
  }
  if (status === "DRAFT" || status === "REJECTED" || (status === "ARCHIVED" && !everPublished)) {
    buttons.push({ label: "Delete", action: "DELETE", confirm: "Delete this listing and its photos permanently?", danger: true });
  }

  if (buttons.length === 0 && !editable) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {editable && (
        <Link
          href={`/dashboard/properties/${id}/edit`}
          className="rounded-full border border-teal px-4 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10"
        >
          {status === "REJECTED" ? "Edit and resubmit" : "Edit"}
        </Link>
      )}
      {buttons.map((b) => (
        <button
          key={b.action + b.label}
          type="button"
          disabled={pending}
          onClick={() => run(b.action, b.confirm)}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            b.danger ? "border-red-300 text-red-700 hover:bg-red-50" : "border-navy/15 text-navy hover:border-teal"
          }`}
        >
          {b.label}
        </button>
      ))}
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </div>
  );
}