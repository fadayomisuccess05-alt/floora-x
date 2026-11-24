"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/messages/actions";

export function Composer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setError("");
    setBusy(true);
    const res = await sendMessage(conversationId, text);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setText("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="space-y-2 border-t border-navy/10 pt-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
        }}
        rows={3}
        maxLength={2000}
        placeholder="Write a message..."
        className="w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink/50">Ctrl + Enter to send</span>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-full bg-amber px-6 py-2.5 text-sm font-bold text-navy disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}