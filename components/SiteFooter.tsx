import Link from "next/link";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/buy", label: "Buy" },
      { href: "/rent", label: "Rent" },
      { href: "/commercial", label: "Commercial" },
      { href: "/land", label: "Land" },
    ],
  },
  {
    title: "Professionals",
    links: [
      { href: "/agents", label: "Find an agent" },
      { href: "/agencies", label: "Find an agency" },
      { href: "/pricing", label: "Pricing" },
      { href: "/register", label: "List your property" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/help", label: "Help centre" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="dark" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Nigeria&rsquo;s property marketplace. Find homes, grow your real
            estate business, and transact with confidence.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h3 className="font-display text-sm font-semibold text-white">
              {c.title}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="transition-colors hover:text-teal-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">
        &copy; {new Date().getFullYear()} Floora-X. All rights reserved.
      </div>
    </footer>
  );
}
