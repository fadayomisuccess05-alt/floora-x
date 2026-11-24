"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Photo = { id: string; url: string };

export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const count = photos.length;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  // Load the neighbouring photos ahead of time so switching feels instant
  useEffect(() => {
    if (count < 2) return;
    [index + 1, index - 1].forEach((j) => {
      const img = new window.Image();
      img.src = photos[(j + count) % count].url;
    });
  }, [index, count, photos]);

  // Keyboard controls and page-scroll lock while the full-screen view is open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [open, go]);

  if (count === 0) {
    return <div className="aspect-[16/10] w-full rounded-2xl bg-mist" />;
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  const arrow =
    "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow transition hover:bg-white";

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-mist" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button type="button" onClick={() => setOpen(true)} aria-label="View photo full screen" className="block w-full cursor-zoom-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[index].url}
            alt={`${title}, photo ${index + 1} of ${count}`}
            className="aspect-[16/10] w-full object-cover"
          />
        </button>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={`${arrow} left-3`}>
              &#8249;
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className={`${arrow} right-3`}>
              &#8250;
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-navy/80 px-3 py-1 text-xs font-semibold text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === index ? "border-teal" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setOpen(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-navy"
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[index].url}
            alt={`${title}, photo ${index + 1} of ${count}`}
            className="max-h-[88vh] max-w-[96vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Previous photo"
                className={`${arrow} left-3`}
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Next photo"
                className={`${arrow} right-3`}
              >
                &#8250;
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}