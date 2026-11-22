import { addDays } from "./dates";
import { STATUS_LABEL } from "./constants";
import type { Task } from "./types";

/** Escape theo chuẩn RFC 5545 */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (iso: string) => iso.replace(/-/g, "");

/** Dòng dài hơn 75 byte phải gập lại */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) {
      out.push(cur);
      cur = " " + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

/** Mỗi task có hạn thành một sự kiện cả ngày, kéo dài từ ngày bắt đầu đến hạn chót */
export function buildICS(tasks: Task[], appUrl = ""): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TTC Điều Hành//VI", "CALSCALE:GREGORIAN", "X-WR-CALNAME:TTC Điều Hành"];
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const start = t.startDate && t.startDate <= t.dueDate ? t.startDate : t.dueDate;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@task-tracker-pro`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`,
      `DTEND;VALUE=DATE:${ymd(addDays(t.dueDate, 1))}`,
      fold(`SUMMARY:${esc((t.status === "done" ? "✓ " : "") + t.title)}`),
      fold(`DESCRIPTION:${esc(`[${STATUS_LABEL[t.status]}] ${t.description}${appUrl ? `\n${appUrl}/tasks?open=${t.id}` : ""}`)}`),
      fold(`CATEGORIES:${esc(t.department)}`),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Link mở Google Calendar với sự kiện điền sẵn (người dùng bấm Lưu bên Google).
 * Có giờ hẹn → sự kiện 1 giờ, ví dụ 09:00-10:00 "Nghiệm thu cốt thép sàn 6"; không có giờ → sự kiện cả ngày.
 */
export function googleCalendarUrl(t: Task): string {
  const due = t.dueDate!;
  let dates: string;
  if (t.dueTime) {
    const [h, m] = t.dueTime.split(":").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    dates = `${ymd(due)}T${pad(h)}${pad(m)}00/${ymd(due)}T${pad(Math.min(h + 1, 23))}${pad(m)}00`;
  } else {
    const start = t.startDate && t.startDate <= due ? t.startDate : due;
    dates = `${ymd(start)}/${ymd(addDays(due, 1))}`;
  }
  const q = new URLSearchParams({ action: "TEMPLATE", text: t.title, dates, ctz: "Asia/Ho_Chi_Minh", details: "Tạo từ TTC Điều Hành" });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
