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
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Task Tracker Pro//VI", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Task Tracker Pro"];
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
