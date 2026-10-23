/** Date helpers using the local timezone (school time), not UTC. */

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toLocalDateStr(new Date());
}

export function isValidDateStr(s: string | null | undefined): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export function parseDateStr(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

export function startOfWeekStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  d.setDate(d.getDate() - diff);
  return toLocalDateStr(d);
}

export function startOfMonthStr(): string {
  const d = new Date();
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2025-12-01" -> "Mon, 01 Dec 2025" */
export function displayDate(s: string): string {
  if (!isValidDateStr(s)) return s;
  const d = parseDateStr(s);
  const dd = String(d.getDate()).padStart(2, "0");
  return `${DAYS[d.getDay()]}, ${dd} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2025-12-01" -> "01 Dec" */
export function displayDateShort(s: string): string {
  if (!isValidDateStr(s)) return s;
  const d = parseDateStr(s);
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd} ${MONTHS[d.getMonth()]}`;
}

export function isWeekend(s: string): boolean {
  if (!isValidDateStr(s)) return false;
  const day = parseDateStr(s).getDay();
  return day === 0 || day === 6;
}
