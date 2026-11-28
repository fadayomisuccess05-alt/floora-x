// Nigeria is UTC+1 all year (no daylight saving), so Lagos times are handled with a fixed offset.

// "2026-12-05T14:30" (typed by the user, Lagos time) -> a real moment in time
export function parseLagos(local: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtLagos(d: Date) {
  return d.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

// The earliest value for a date-time input, as Lagos wall-clock time
export function lagosMin(hoursAhead: number) {
  return new Date(Date.now() + (hoursAhead + 1) * 3600000).toISOString().slice(0, 16);
}