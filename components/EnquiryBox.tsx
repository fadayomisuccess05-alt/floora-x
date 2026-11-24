"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startEnquiry } from "@/app/messages/actions";

type Props = {
  propertyId: string;
  title: string;
  mode: "guest" | "own" | "admin" | "existing" | "ready";
  conversationId?: string;
};

export function EnquiryBox({ propertyId, title, mode, conversationId }: Props) {
  const router = useRouter();
  const [text, setText] = useState(`Hello, I'm interested in "${title}". Is it still available?`);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (mode === "guest") {
    return (
      <div className="space-y-3 rounded-xl bg-mist p-4 text-sm text-ink/80">
        <p>Log in or create a free account to send an enquiry to the owner.</p>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-full bg-navy px-4 py-2 text-xs font-bold text-white">Log in</Link>
          <Link href="/register" className="rounded-full bg-amber px-4 py-2 text-xs font-bold text-navy">Register</Link>
        </div>
      </div>
    );
  }
  if (mode === "own") {
    return <div className="rounded-xl bg-mist p-4 text-sm text-ink/75">This is your listing.</div>;
  }
  if (mode === "admin") {
    return <div className="rounded-xl bg-mist p-4 text-sm text-ink/75">Administrator accounts can&rsquo;t send enquiries.</div>;
  }
  if (mode === "existing" && conversationId) {
    return (
      <div className="space-y-3 rounded-xl bg-mist p-4 text-sm text-ink/80">
        <p>You have already contacted the owner about this property.</p>
        <Link href={`/dashboard/messages/${conversationId}`} className="inline-block rounded-full bg-navy px-4 py-2 text-xs font-bold text-white">
          Open conversation
        </Link>
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await startEnquiry(propertyId, text);
    setBusy(false);
    if (!res.ok) {
      if (res.needsLogin) return router.push("/login");
      return setError(res.error);
    }
    router.push(`/dashboard/messages/${res.conversationId}`);
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <p className="text-sm font-semibold text-navy">Send an enquiry</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-amber px-5 py-3 text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Sending..." : "Send enquiry"}
      </button>
    </form>
  );
}