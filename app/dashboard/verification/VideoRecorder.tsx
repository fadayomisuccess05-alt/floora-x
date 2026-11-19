"use client";

import { useEffect, useRef, useState } from "react";

export function VideoRecorder({
  code,
  onRecorded,
}: {
  code: string;
  onRecorded: (file: File | null) => void;
}) {
  const liveRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const [state, setState] = useState<"idle" | "ready" | "recording" | "done">(
    "idle",
  );
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function openCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser can't use the camera here. Open the site in Chrome, using localhost or an https address.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play();
      }
      setState("ready");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "Unknown";
      const messages: Record<string, string> = {
        NotAllowedError:
          "Camera or microphone permission is blocked. Allow both for this site, then try again.",
        NotFoundError:
          "No camera or no microphone was found on this device. Both are required.",
        NotReadableError:
          "Your camera or microphone is being used by another app. Close it (Zoom, Teams, another tab) and try again.",
        OverconstrainedError:
          "Your camera doesn't support the requested settings.",
        SecurityError: "The browser blocked camera access on this page.",
      };
      setError(
        `${messages[name] ?? "We could not open your camera."} (${name})`,
      );
    }
  }
  function start() {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
      (t) => MediaRecorder.isTypeSupported(t),
    );
    const rec = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 800_000,
    });
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (Date.now() - startedAt.current < 4000) {
        setError("That was too short. Record at least 5 seconds.");
        setState("idle");
        return;
      }
      const base = (rec.mimeType || mime || "video/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type: base });
      const ext = base.includes("mp4") ? "mp4" : "webm";
      setPreviewUrl(URL.createObjectURL(blob));
      onRecorded(new File([blob], `video.${ext}`, { type: base }));
      setState("done");
    };
    startedAt.current = Date.now();
    rec.start();
    recRef.current = rec;
    setState("recording");
    timer.current = setTimeout(() => {
      if (rec.state === "recording") rec.stop();
    }, 20000);
  }

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  function retake() {
    setPreviewUrl(null);
    onRecorded(null);
    setState("idle");
  }

  const btn = "rounded-full px-5 py-2.5 text-sm font-bold";

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-navy p-4 text-center text-white">
        <p className="text-sm text-white/70">
          Hold your NIN card next to your face, make sure the card is readable,
          and say this code out loud:
        </p>
        <p className="mt-1 font-display text-4xl font-bold tracking-[0.3em] text-amber">
          {code}
        </p>
      </div>

      <video
        ref={liveRef}
        muted
        playsInline
        className={`w-full rounded-xl bg-black ${state === "ready" || state === "recording" ? "" : "hidden"}`}
      />
      {state === "done" && previewUrl && (
        <video
          src={previewUrl}
          controls
          playsInline
          className="w-full rounded-xl bg-black"
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {state === "idle" && (
          <button
            type="button"
            onClick={openCamera}
            className={`${btn} bg-navy text-white`}
          >
            Open camera
          </button>
        )}
        {state === "ready" && (
          <button
            type="button"
            onClick={start}
            className={`${btn} bg-amber text-navy`}
          >
            Start recording
          </button>
        )}
        {state === "recording" && (
          <button
            type="button"
            onClick={stop}
            className={`${btn} bg-red-600 text-white`}
          >
            Stop (max 20 seconds)
          </button>
        )}
        {state === "done" && (
          <button
            type="button"
            onClick={retake}
            className={`${btn} border border-navy/20 text-navy`}
          >
            Record again
          </button>
        )}
      </div>
    </div>
  );
}
