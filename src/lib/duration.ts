// Tenure that keeps itself current, so nothing here needs editing every month.
//
// Months are counted inclusively, the way LinkedIn does it: someone who started
// in Dec 2025 has been there 9 months by Aug 2026, not 8. That matches how
// people describe their own tenure out loud.

type Style = "short" | "long";

const WORDS = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "eleven",
];

export function monthsSince(startISO: string, now: Date = new Date()): number {
  const start = new Date(`${startISO}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`duration: "${startISO}" is not a YYYY-MM-DD date`);
  }

  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;

  return Math.max(1, months);
}

export function formatDuration(months: number, style: Style = "short"): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(unit(years, "year", style));
  if (rest > 0) parts.push(unit(rest, "month", style));
  if (parts.length === 0) parts.push(unit(1, "month", style));

  if (style === "short") return parts.join(" ");

  const joined = parts.join(" and ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export function tenure(startISO: string, style: Style = "short"): string {
  return formatDuration(monthsSince(startISO), style);
}

function unit(n: number, name: string, style: Style): string {
  const count = style === "long" ? (WORDS[n] ?? String(n)) : String(n);
  return `${count} ${name}${n === 1 ? "" : "s"}`;
}
