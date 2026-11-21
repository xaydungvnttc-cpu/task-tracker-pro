/**
 * Ngày được lưu dạng chuỗi "YYYY-MM-DD" (không giờ) để tránh lệch múi giờ.
 * Mọi phép tính ngày đi qua các hàm ở đây.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Hôm nay theo giờ máy, hoặc theo một múi giờ cụ thể (dùng phía server) */
export function todayISO(timeZone?: string): string {
  if (!timeZone) return toISO(new Date());
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);
}

export function weekday(iso: string): number {
  return fromISO(iso).getDay();
}

/** Tuần bắt đầu từ Thứ Hai */
export function startOfWeek(iso: string): string {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function endOfMonth(iso: string): string {
  return addDays(addMonths(startOfMonth(iso), 1), -1);
}

export function startOfQuarter(iso: string): string {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1));
}

export function endOfQuarter(iso: string): string {
  return addDays(addMonths(startOfQuarter(iso), 3), -1);
}

export function formatDate(iso: string | null, withYear = false): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

export function formatDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function monthLabel(iso: string): string {
  const d = fromISO(iso);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Khoảng [a1,a2] có giao [b1,b2] không */
export function overlaps(a1: string, a2: string, b1: string, b2: string): boolean {
  return a1 <= b2 && b1 <= a2;
}

export function nowISO(): string {
  return new Date().toISOString();
}
