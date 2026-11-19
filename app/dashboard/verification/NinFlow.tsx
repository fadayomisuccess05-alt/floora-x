"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startNin, getUploadUrls, finalizeVerification } from "./actions";
import { VideoRecorder } from "./VideoRecorder";
import { StatusBox } from "./StatusBox";
import { compressImage } from "@/lib/verification/image";
import { createClient } from "@/lib/supabase/client";

type Props = {
  status: "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  reason: string | null;
  masked: string | null;
};

const input =
  "w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

export function NinFlow({ status, reason, masked }: Props) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [nin, setNin] = useState("");
  const [vid, setVid] = useState<{ id: string; code: string } | null>(null);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  if (status === "VERIFIED") {
    return (
      <StatusBox tone="ok" title="ID Checked">
        Your identity was confirmed{masked ? ` (NIN ${masked})` : ""}.
      </StatusBox>
    );
  }
  if (status === "PENDING") {
    return (
      <StatusBox tone="wait" title="Under review">
        We received your documents. A Floora-X reviewer will check them, and your status will update here.
      </StatusBox>
    );
  }

  async function begin() {
    setError("");
    setBusy(true);
    const res = await startNin(nin);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setVid({ id: res.verificationId, code: res.challengeCode });
  }

  async function submit() {
    if (!vid || !front || !video) return;
    setError("");
    setBusy(true);
    try {
      setProgress("Preparing your files...");
      const files = [
        { kind: "NIN_CARD_FRONT", file: await compressImage(front) },
        ...(back ? [{ kind: "NIN_CARD_BACK", file: await compressImage(back) }] : []),
        { kind: "NIN_VIDEO", file: video },
      ];
      const urls = await getUploadUrls(
        vid.id,
        files.map((f) => ({ kind: f.kind, mime: f.file.type, size: f.file.size }))
      );
      if (!urls.ok) throw new Error(urls.error);

      const supabase = createClient();
      for (const item of urls.items) {
        const f = files.find((x) => x.kind === item.kind)!;
        setProgress(item.kind === "NIN_VIDEO" ? "Uploading video..." : "Uploading card photo...");
        const { error: upErr } = await supabase.storage
          .from(urls.bucket)
          .uploadToSignedUrl(item.path, item.token, f.file, { contentType: f.file.type });
        if (upErr) throw new Error("Upload failed. Check your connection and try again.");
      }

      setProgress("Finishing...");
      const done = await finalizeVerification(vid.id);
      if (!done.ok) throw new Error(done.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-5">
      {status === "REJECTED" && (
        <StatusBox tone="bad" title="Your last submission was not approved">
          {reason ?? "Please try again with clearer photos."}
        </StatusBox>
      )}

      {!vid ? (
        <div className="space-y-4">
          <p className="text-sm text-ink/80">
            We check your NIN card and a short video to confirm you are the person on the card. Only Floora-X
            reviewers can see them, they are stored privately, and the video is deleted after review.
          </p>
          <div>
            <label htmlFor="nin" className="mb-1.5 block text-sm font-semibold text-navy">Your NIN (11 digits)</label>
            <input
              id="nin"
              inputMode="numeric"
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
              className={input}
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-ink/80">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            I agree that Floora-X may collect and review my NIN, card photo and video to verify my identity.
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            onClick={begin}
            disabled={busy || !consent || nin.length !== 11}
            className="rounded-full bg-amber px-6 py-3 font-bold text-navy disabled:opacity-50"
          >
            {busy ? "Please wait..." : "Continue"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-bold text-navy">1. Photo of your NIN card or slip</h3>
            <div>
              <label className="mb-1 block text-sm font-semibold text-navy">Front (required)</label>
              <input type="file" accept="image/*" onChange={(e) => setFront(e.target.files?.[0] ?? null)} className={input} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-navy">Back (if your card has one)</label>
              <input type="file" accept="image/*" onChange={(e) => setBack(e.target.files?.[0] ?? null)} className={input} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-navy">2. Short video</h3>
            <VideoRecorder code={vid.code} onRecorded={setVideo} />
          </div>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {progress && <p className="text-sm text-teal">{progress}</p>}

          <button
            onClick={submit}
            disabled={busy || !front || !video}
            className="rounded-full bg-amber px-6 py-3 font-bold text-navy disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      )}
    </div>
  );
}