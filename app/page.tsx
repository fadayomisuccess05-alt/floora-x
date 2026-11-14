import Link from "next/link";

const divisions = [
  {
    title: "Marketplace",
    text: "Search homes, land and commercial property in every state, with clear pricing and verified listings.",
  },
  {
    title: "Network",
    text: "Agents and agencies share listings with permission and agree commissions in writing.",
  },
  {
    title: "Connect",
    text: "Follow agents and agencies and get alerts when a property matching your needs appears.",
  },
  {
    title: "Floora-Trust",
    text: "Optional protected payments: funds are held by a licensed partner and released when the deal is fulfilled.",
  },
];

export default function Home() {
  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-light">
            Property across Nigeria
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight !text-white md:text-6xl">
            Find the place. Meet the people. Close with confidence.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            Floora-X connects property seekers, landlords, agents and agencies
            in one trusted marketplace.
          </p>

          {/* Placeholder search: wired to real results in the marketplace stage */}
          <form
            action="/search"
            className="mt-10 grid gap-3 rounded-2xl bg-white p-3 shadow-2xl md:grid-cols-[1fr_1fr_1.4fr_auto]"
          >
            <select
              name="for"
              aria-label="Buy or rent"
              className="rounded-xl bg-mist px-4 py-3 text-navy"
            >
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
            </select>
            <select
              name="type"
              aria-label="Property type"
              className="rounded-xl bg-mist px-4 py-3 text-navy"
            >
              <option value="">Any type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="commercial">Commercial</option>
              <option value="land">Land</option>
            </select>
            <input
              name="location"
              placeholder="State, city or neighbourhood"
              aria-label="Location"
              className="rounded-xl bg-mist px-4 py-3 text-navy placeholder:text-navy/50"
            />
            <button
              type="submit"
              className="rounded-xl bg-amber px-8 py-3 font-bold text-navy transition-transform hover:scale-[1.02]"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold md:text-4xl">
          One platform, four ways to work
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {divisions.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-navy/10 bg-white p-6"
            >
              <div className="mb-4 h-1.5 w-10 rounded-full bg-teal" />
              <h3 className="text-lg font-bold">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                {d.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-navy-2 p-10 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold !text-white md:text-3xl">
              Own or manage property?
            </h2>
            <p className="mt-2 max-w-md text-white/75">
              List for free as a landlord, or grow your business as an agent or
              agency.
            </p>
          </div>
          <Link
            href="/register"
            className="rounded-full bg-amber px-8 py-3 font-bold text-navy transition-transform hover:scale-[1.03]"
          >
            Create your account
          </Link>
        </div>
      </section>
    </>
  );
}
