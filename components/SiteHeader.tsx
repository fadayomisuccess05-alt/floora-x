import Link from "next/link";
import { Logo } from "./Logo";

const links = [
  { href: "/buy", label: "Buy" },
  { href: "/rent", label: "Rent" },
  { href: "/commercial", label: "Commercial" },
  { href: "/land", label: "Land" },
  { href: "/agents", label: "Agents" },
  { href: "/agencies", label: "Agencies" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Floora-X home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-navy/80 transition-colors hover:text-teal"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-semibold text-navy hover:text-teal"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-amber px-5 py-2 text-sm font-bold text-navy transition-transform hover:scale-[1.03]"
          >
            Register
          </Link>
        </div>

        {/* Mobile menu: no JavaScript needed */}
        <details className="relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-navy/15 text-navy [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Menu</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-navy/10 bg-white p-3 shadow-xl">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-navy hover:bg-mist"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-navy/10 pt-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-navy hover:bg-mist"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-amber px-3 py-2 text-center text-sm font-bold text-navy"
              >
                Register
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
