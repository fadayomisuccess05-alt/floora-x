"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";

type Item = { label: string; href?: string };

// The most specific link that matches the current page is the active one
function activeHref(items: Item[], pathname: string) {
  let best = "";
  for (const i of items) {
    if (!i.href || i.href === "/") continue;
    if ((pathname === i.href || pathname.startsWith(i.href + "/")) && i.href.length > best.length) {
      best = i.href;
    }
  }
  return best;
}

export function DashboardNav({ items, name, role }: { items: Item[]; name: string; role: string }) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);
  const current = items.find((i) => i.href === active)?.label ?? "Dashboard";
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu when tapping outside it or pressing Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = (
    <ul className="space-y-1">
      {items.map((item) => {
        if (!item.href) {
          return (
            <li key={item.label} className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm text-navy/45">
              {item.label}
              <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span>
            </li>
          );
        }
        const isActive = item.href === active;
        return (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={`block rounded-xl px-4 py-2.5 text-sm font-semibold ${
                isActive ? "bg-navy text-white" : "text-navy hover:bg-mist"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const logoutButton = (
    <form action={logout}>
      <button className="w-full rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-mist">
        Log out
      </button>
    </form>
  );

  return (
    <>
      {/* Desktop: sidebar */}
      <aside className="hidden md:sticky md:top-24 md:block md:max-h-[calc(100vh-7rem)] md:w-64 md:shrink-0 md:self-start md:overflow-y-auto">
        <div className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="truncate font-bold text-navy">{name}</p>
          <p className="text-sm font-medium text-teal">{role}</p>
        </div>
        <nav aria-label="Dashboard" className="mt-4">{list}</nav>
        <div className="mt-4">{logoutButton}</div>
      </aside>

      {/* Mobile: a bar that opens a dropdown */}
      <div ref={barRef} className="sticky top-16 z-30 border-b border-navy/10 bg-white md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-xs text-ink/60">{name} &middot; {role}</span>
            <span className="block truncate font-bold text-navy">{current}</span>
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 text-navy transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <nav
            aria-label="Dashboard"
            className="absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b border-navy/10 bg-white p-3 shadow-xl"
          >
            {list}
            <div className="mt-3 border-t border-navy/10 pt-3">{logoutButton}</div>
          </nav>
        )}
      </div>
    </>
  );
}