// lib/date.js

export function parseYYYYMMDDLocal(s) {
  if (!s || typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d); // LOCAL midnight
}

export function fmtDate(d) {
  if (!d) return "—";

  if (typeof d === "string") {
    const local = parseYYYYMMDDLocal(d);
    if (local) {
      return local.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
