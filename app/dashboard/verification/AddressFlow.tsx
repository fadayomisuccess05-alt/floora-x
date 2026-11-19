"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAddress, getUploadUrls, finalizeVerification } from "./actions";
import { StatusBox } from "./StatusBox";
import { compressImage } from "@/lib/verification/image";
import { createClient } from "@/lib/supabase/client";

type Props = {
  status: "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  reason: string | null;
  ninVerified: boolean;
};

const input =
  "w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

export function AddressFlow({ status, reason, ninVerified }: Props) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [bill, setBill] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "VERIFIED") {
    return <StatusBox tone="ok" title="Address Verified">Your address badge is active.</StatusBox>;
  }
  if (status === "PENDING") {
    return (
      <StatusBox tone="wait" title="Under review">
        We received your utility bill. A reviewer will check it, and your status will update here.
      </StatusBox>
    );
  }
  if (!ninVerified) {
    return (
      <StatusBox tone="wait" title="Complete ID verification first">
        Address verification opens after your ID check is approved.
      </StatusBox>
    );
  }

  async function submit() {
    if (!bill) return;
    setError("");
    setBusy(true);
    try {
      const started = await startAddress(address);
      if (!started.ok) throw new Error(started.error);

      const file = await compressImage(bill);
      const urls = await getUploadUrls(started.verificationId, [
        { kind: "UTILITY_BILL", mime: file.type, size: file.size },
      ]);
      if (!urls.ok) throw new Error(urls.error);

      const supabase = createClient();
      const item = urls.items[0];
      const { error: upErr } = await supabase.storage
        .from(urls.bucket)
        .uploadToSignedUrl(item.path, item.token, file, { contentType: file.type });
      if (upErr) throw new Error("Upload failed. Check your connection and try again.");

      const done = await finalizeVerification(started.verificationId);
      if (!done.ok) throw new Error(done.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {(status === "REJECTED" || status === "EXPIRED") && (
        <StatusBox tone="bad" title={status === "EXPIRED" ? "Your address badge expired" : "Your last submission was not approved"}>
          {reason ?? "Please submit a recent utility bill."}
        </StatusBox>
      )}
      <p className="text-sm text-ink/80">
        Upload a recent electricity, water or waste bill (dated within the last 3 months). The name must match your
        ID, and the address must match what you type below.
      </p>
      <div>
        <label htmlFor="address" className="mb-1.5 block text-sm font-semibold text-navy">Address on the bill</label>
        <textarea id="address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-navy">Utility bill (photo or PDF)</label>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setBill(e.target.files?.[0] ?? null)} className={input} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !bill || address.trim().length < 10}
        className="rounded-full bg-amber px-6 py-3 font-bold text-navy disabled:opacity-50"
      >
        {busy ? "Submitting..." : "Submit for review"}
      </button>
    </div>
  );
}