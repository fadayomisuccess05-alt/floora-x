"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createListing, getPropertyUploadUrls, finalizeListing } from "../actions";
import { propertySchema, TRANSACTION_OPTIONS } from "@/lib/properties/schema";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { compressImage } from "@/lib/verification/image";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string; group: string; hasRooms: boolean };
type Amenity = { id: string; name: string };
type Props = { categories: Category[]; amenities: Amenity[]; maxPhotos: number };

const input =
  "w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-navy placeholder:text-navy/40 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";
const GROUPS: Record<string, string> = { RESIDENTIAL: "Residential", COMMERCIAL: "Commercial", LAND: "Land" };
const FURNISHING = [
  { value: "", label: "Not stated" },
  { value: "UNFURNISHED", label: "Unfurnished" },
  { value: "SEMI_FURNISHED", label: "Semi-furnished" },
  { value: "FURNISHED", label: "Furnished" },
];

const int = (s: string) => {
  const t = s.replace(/[^\d]/g, "");
  return t ? parseInt(t, 10) : null;
};
const dec = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-navy/10 bg-white p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function PropertyForm({ categories, amenities, maxPhotos }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    title: "", description: "", categoryId: "", transactionType: "FOR_RENT",
    state: "", lga: "", city: "", neighbourhood: "", streetAddress: "", hideExactAddress: true,
    bedrooms: "", bathrooms: "", toilets: "", parkingSpaces: "", sizeSqm: "", furnishing: "", yearBuilt: "",
    price: "", pricePeriod: "YEAR", negotiable: false,
  });
  const [charges, setCharges] = useState<{ label: string; amount: string }[]>([]);
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const category = categories.find((c) => c.id === f.categoryId);
  const showRooms = category?.hasRooms ?? true;
  const isSale = f.transactionType === "FOR_SALE";
  const priceNum = int(f.price);

  function changeTransaction(v: string) {
    setF((p) => ({
      ...p,
      transactionType: v,
      pricePeriod: v === "FOR_SALE" ? "ONE_OFF" : v === "SHORT_TERM" ? "DAY" : "YEAR",
    }));
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const room = Math.max(0, maxPhotos - photos.length);
    const picked = Array.from(list).filter((x) => x.type.startsWith("image/"));
    const next = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...next]);
    setError(picked.length > room ? `You can add up to ${maxPhotos} photos.` : "");
  }
  function removePhoto(i: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, k) => k !== i);
    });
  }
  function move(i: number, d: number) {
    setPhotos((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const c = [...p];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  function buildPayload() {
    return {
      title: f.title,
      description: f.description,
      categoryId: f.categoryId,
      transactionType: f.transactionType,
      state: f.state,
      lga: f.lga || undefined,
      city: f.city,
      neighbourhood: f.neighbourhood || undefined,
      streetAddress: f.streetAddress || undefined,
      hideExactAddress: f.hideExactAddress,
      bedrooms: showRooms ? int(f.bedrooms) : null,
      bathrooms: showRooms ? int(f.bathrooms) : null,
      toilets: showRooms ? int(f.toilets) : null,
      parkingSpaces: int(f.parkingSpaces),
      sizeSqm: dec(f.sizeSqm),
      furnishing: f.furnishing || null,
      yearBuilt: int(f.yearBuilt),
      priceNaira: int(f.price) ?? 0,
      pricePeriod: f.pricePeriod,
      negotiable: f.negotiable,
      additionalCharges: charges
        .filter((c) => c.label.trim())
        .map((c) => ({ label: c.label.trim(), amount: int(c.amount) ?? 0 })),
      amenityIds,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = propertySchema.safeParse(buildPayload());
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form.");
    if (photos.length < 1) return setError("Add at least one photo.");

    setBusy(true);
    try {
      setProgress("Saving the details...");
      const created = await createListing(parsed.data, draftId ?? undefined);
      if (!created.ok) throw new Error(created.error);
      setDraftId(created.propertyId);

      setProgress("Preparing photos...");
      const prepared: File[] = [];
      for (const p of photos) prepared.push(await compressImage(p.file));

      const urls = await getPropertyUploadUrls(
        created.propertyId,
        prepared.map((x) => ({ mime: x.type, size: x.size }))
      );
      if (!urls.ok) throw new Error(urls.error);

      const supabase = createClient();
      for (let i = 0; i < urls.items.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${urls.items.length}...`);
        const { error: upErr } = await supabase.storage
          .from(urls.bucket)
          .uploadToSignedUrl(urls.items[i].path, urls.items[i].token, prepared[i], {
            contentType: prepared[i].type,
          });
        if (upErr) throw new Error("A photo failed to upload. Check your connection and try again.");
      }

      setProgress("Submitting...");
      const done = await finalizeListing(created.propertyId, urls.items.map((i) => i.path));
      if (!done.ok) throw new Error(done.error);
      router.push("/dashboard/properties?submitted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const groups = ["RESIDENTIAL", "COMMERCIAL", "LAND"];

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Basics">
        <Field label="Title" hint="Example: Spacious 3-bedroom flat in Effurun, Warri">
          <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Property category">
            <select className={input} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Choose a category</option>
              {groups.map((g) => (
                <optgroup key={g} label={GROUPS[g]}>
                  {categories.filter((c) => c.group === g).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="This property is">
            <select className={input} value={f.transactionType} onChange={(e) => changeTransaction(e.target.value)}>
              {TRANSACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" hint="Describe the property, its condition and what is nearby. At least 30 characters.">
          <textarea className={input} rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
        </Field>
      </Section>

      <Section title="Location">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="State">
            <select className={input} value={f.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Choose a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Local government area (optional)">
            <input className={input} value={f.lga} onChange={(e) => set("lga", e.target.value)} />
          </Field>
          <Field label="City or town">
            <input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Neighbourhood (optional)">
            <input className={input} value={f.neighbourhood} onChange={(e) => set("neighbourhood", e.target.value)} />
          </Field>
        </div>
        <Field label="Street address (optional)">
          <input className={input} value={f.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} />
        </Field>
        <label className="flex items-start gap-3 text-sm text-ink/80">
          <input type="checkbox" className="mt-1" checked={f.hideExactAddress} onChange={(e) => set("hideExactAddress", e.target.checked)} />
          Hide the exact street address from the public. Show only the area.
        </label>
      </Section>

      <Section title="Details">
        <div className="grid gap-5 sm:grid-cols-3">
          {showRooms && (
            <>
              <Field label="Bedrooms">
                <input className={input} inputMode="numeric" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
              </Field>
              <Field label="Bathrooms">
                <input className={input} inputMode="numeric" value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
              </Field>
              <Field label="Toilets">
                <input className={input} inputMode="numeric" value={f.toilets} onChange={(e) => set("toilets", e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Parking spaces">
            <input className={input} inputMode="numeric" value={f.parkingSpaces} onChange={(e) => set("parkingSpaces", e.target.value)} />
          </Field>
          <Field label={category?.group === "LAND" ? "Land size (sqm)" : "Size (sqm)"}>
            <input className={input} inputMode="decimal" value={f.sizeSqm} onChange={(e) => set("sizeSqm", e.target.value)} />
          </Field>
          {category?.group !== "LAND" && (
            <Field label="Year built">
              <input className={input} inputMode="numeric" maxLength={4} value={f.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} />
            </Field>
          )}
        </div>
        {category?.group !== "LAND" && (
          <Field label="Furnishing">
            <select className={input} value={f.furnishing} onChange={(e) => set("furnishing", e.target.value)}>
              {FURNISHING.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        )}
      </Section>

      <Section title="Price">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={isSale ? "Asking price (₦)" : "Price (₦)"} hint={priceNum ? `₦${priceNum.toLocaleString("en-NG")}` : undefined}>
            <input className={input} inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
          {!isSale && (
            <Field label="Paid">
              <select className={input} value={f.pricePeriod} onChange={(e) => set("pricePeriod", e.target.value)}>
                <option value="YEAR">per year</option>
                <option value="MONTH">per month</option>
                <option value="DAY">per day</option>
              </select>
            </Field>
          )}
        </div>
        <label className="flex items-center gap-3 text-sm text-ink/80">
          <input type="checkbox" checked={f.negotiable} onChange={(e) => set("negotiable", e.target.checked)} />
          The price is negotiable
        </label>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-navy">Other charges (caution, agency, legal, agreement, service...)</p>
          {charges.map((c, i) => (
            <div key={i} className="flex gap-3">
              <input className={input} placeholder="Name, e.g. Caution fee" value={c.label}
                onChange={(e) => setCharges((p) => p.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
              <input className={input} placeholder="Amount (₦)" inputMode="numeric" value={c.amount}
                onChange={(e) => setCharges((p) => p.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} />
              <button type="button" onClick={() => setCharges((p) => p.filter((_, k) => k !== i))}
                className="shrink-0 rounded-xl border border-navy/15 px-4 text-sm font-semibold text-navy">
                Remove
              </button>
            </div>
          ))}
          {charges.length < 8 && (
            <button type="button" onClick={() => setCharges((p) => [...p, { label: "", amount: "" }])}
              className="rounded-full border border-teal px-4 py-2 text-sm font-semibold text-teal">
              + Add a charge
            </button>
          )}
        </div>
      </Section>

      <Section title="Amenities">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.id} className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={amenityIds.includes(a.id)}
                onChange={(e) =>
                  setAmenityIds((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))
                }
              />
              {a.name}
            </label>
          ))}
        </div>
      </Section>

      <Section title={`Photos (up to ${maxPhotos})`}>
        <p className="text-sm text-ink/70">
          The first photo is your cover. Use the arrows to reorder. Clear, bright photos get more enquiries.
        </p>
        {photos.length < maxPhotos && (
          <input type="file" accept="image/*" multiple className={input}
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <div key={p.url} className="relative overflow-hidden rounded-xl border border-navy/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-navy">Cover</span>
              )}
              <div className="flex items-center justify-between gap-1 p-2 text-xs font-semibold text-navy">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-2 disabled:opacity-30">&larr;</button>
                <button type="button" onClick={() => removePhoto(i)} className="text-red-600">Remove</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} className="px-2 disabled:opacity-30">&rarr;</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {progress && <p className="text-sm font-semibold text-teal">{progress}</p>}

      <button type="submit" disabled={busy}
        className="w-full rounded-full bg-amber px-6 py-3.5 font-bold text-navy transition hover:scale-[1.01] disabled:opacity-60">
        {busy ? "Please wait..." : "Submit for review"}
      </button>
    </form>
  );
}