"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/follows/actions";

type Props = {
  targetType: "AGENT" | "AGENCY";
  targetId: string;
  label: string;
  following: boolean;
  loggedIn: boolean;
  cost?: number;
};

export function FollowButton({ targetType, targetId, label, following, loggedIn, cost = 0 }: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(following);
  const [error, setError] = useState("");
  const [needsPoints, setNeedsPoints] = useState(false);
  const [pending, start] = useTransition();

  function click() {
    if (!loggedIn) return router.push("/login");
    if (isFollowing && !window.confirm("Unfollow? Points you spent on following are not refunded.")) return;
    setError("");
    setNeedsPoints(false);
    start(async () => {
      const res = await toggleFollow(targetType, targetId);
      if (res.ok) {
        setIsFollowing(res.following);
        router.refresh();
      } else {
        if (res.needsLogin) return router.push("/login");
        if (res.code === "INSUFFICIENT_POINTS") setNeedsPoints(true);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className={`rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
          isFollowing ? "border-teal bg-teal/10 text-teal" : "border-navy/15 text-navy hover:border-teal"
        }`}
      >
        {isFollowing ? "✓ Following" : cost > 0 ? `${label} · ${cost} pts` : label}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {needsPoints && (
        <Link href="/dashboard/points" className="text-xs font-semibold text-teal hover:underline">Buy points</Link>
      )}
    </div>
  );
}