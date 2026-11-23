"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/favorites/actions";

type Props = {
  propertyId: string;
  saved: boolean;
  loggedIn: boolean;
  variant?: "icon" | "button";
  className?: string;
};

export function FavoriteButton({ propertyId, saved, loggedIn, variant = "icon", className = "" }: Props) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(saved);
  const [, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    const before = isSaved;
    setIsSaved(!before);
    startTransition(async () => {
      const res = await toggleFavorite(propertyId);
      if (res.ok) {
        setIsSaved(res.saved);
      } else {
        setIsSaved(before);
        if (res.needsLogin) router.push("/login");
      }
    });
  }

  const heart = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={isSaved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSaved}
        className={`inline-flex items-center gap-2 rounded-full border border-navy/15 px-4 py-2 text-sm font-semibold hover:border-teal ${
          isSaved ? "text-red-500" : "text-navy"
        } ${className}`}
      >
        {heart}
        {isSaved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from saved properties" : "Save property"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow transition hover:scale-110 ${
        isSaved ? "text-red-500" : "text-navy"
      } ${className}`}
    >
      {heart}
    </button>
  );
}