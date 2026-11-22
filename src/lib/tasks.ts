import { addDays, addMonths, diffDays, nowISO, overlaps, startOfWeek, weekday } from "./dates";
import type { Recurrence, Scope, Task, User } from "./types";

/** randomUUID chỉ có ở "secure context"; mở app qua IP LAN bằng http sẽ không có, nên cần dự phòng */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function isOverdue(t: Task, today: string): boolean {
  return t.status !== "done" && !!t.dueDate && t.dueDate < today;
}

/** Số ngày còn lại tới hạn (âm = quá hạn), null nếu không có hạn */
export function daysLeft(t: Task, today: string): number | null {
  return t.dueDate ? diffDays(t.dueDate, today) : null;
}

export function isDueWithin(t: Task, today: string, days: number): boolean {
  const d = daysLeft(t, today);
  return t.status !== "done" && d !== null && d >= 0 && d <= days;
}

/** % tiến độ: Hoàn thành = 100, còn lại tính theo checklist */
export function progressOf(t: Task): number {
  if (t.status === "done") return 100;
  if (t.checklist.length === 0) return 0;
  return Math.round((t.checklist.filter((c) => c.done).length / t.checklist.length) * 100);
}

/** Khoảng ngày mà task chiếm trên lịch */
export function taskRange(t: Task): [string, string] {
  const created = t.createdAt.slice(0, 10);
  let start = t.startDate ?? t.dueDate ?? created;
  let end = t.dueDate ?? t.completedAt?.slice(0, 10) ?? "9999-12-31";
  if (start > end) [start, end] = [end, start];
  return [start, end];
}

export function inPeriod(t: Task, from: string, to: string): boolean {
  const [s, e] = taskRange(t);
  return overlaps(s, e, from, to);
}

export function isTodayTask(t: Task, today: string): boolean {
  if (t.status === "done") return t.completedAt?.slice(0, 10) === today;
  if (t.dueDate && t.dueDate <= today) return true;
  if (t.startDate && t.dueDate && t.startDate <= today && today <= t.dueDate) return true;
  return !t.dueDate && t.status === "in_progress";
}

export function quadrantOf(t: Task): "q1" | "q2" | "q3" | "q4" {
  if (t.important && t.urgent) return "q1";
  if (t.important) return "q2";
  if (t.urgent) return "q3";
  return "q4";
}

export function applyScope(tasks: Task[], scope: Scope, me: User | null): Task[] {
  if (!me || scope === "all") return tasks;
  if (scope === "mine") return tasks.filter((t) => t.assigneeId === me.id || t.watcherIds.includes(me.id));
  if (scope === "team") return tasks.filter((t) => t.department === me.department);
  return tasks.filter((t) => !t.assigneeId);
}

/* ---------------- Việc định kỳ ---------------- */

function nextDue(anchor: string, r: Recurrence): string {
  switch (r.freq) {
    case "daily":
      return addDays(anchor, 1);
    case "weekly": {
      const days = r.weekdays?.length ? r.weekdays : [weekday(anchor)];
      for (let i = 1; i <= 7; i++) {
        const d = addDays(anchor, i);
        if (days.includes(weekday(d))) return d;
      }
      return addDays(anchor, 7);
    }
    case "monthly":
      return addMonths(anchor, 1);
    case "quarterly":
      return addMonths(anchor, 3);
  }
}

/**
 * Kỳ kế tiếp của một task định kỳ. Nếu đã trễ nhiều kỳ thì nhảy thẳng tới kỳ chứa hôm nay,
 * để nghỉ 10 ngày không sinh ra 10 việc hàng ngày.
 */
export function nextOccurrence(t: Task, today: string): { startDate: string | null; dueDate: string } | null {
  if (!t.recurrence) return null;
  const anchor = t.dueDate ?? t.startDate ?? today;
  const duration = t.startDate && t.dueDate ? diffDays(t.dueDate, t.startDate) : 0;
  let due = nextDue(anchor, t.recurrence);
  while (due < today) due = nextDue(due, t.recurrence);
  return { startDate: t.startDate ? addDays(due, -duration) : null, dueDate: due };
}

export function buildNextInstance(t: Task, today: string): Task | null {
  const occ = nextOccurrence(t, today);
  if (!occ) return null;
  const now = nowISO();
  return {
    ...t,
    // Id cố định theo chuỗi + hạn: 2 máy cùng sinh kỳ mới sẽ ghi đè cùng một bản ghi, không bị trùng
    id: `${t.id.split("~")[0]}~${occ.dueDate}`,
    ...occ,
    status: "todo",
    checklist: t.checklist.map((c) => ({ ...c, id: newId(), done: false })),
    outputLinks: [],
    comments: [],
    recurrenceSpawned: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Quy tắc sinh việc định kỳ (dùng chung cho trình duyệt và cron):
 * mỗi bản ghi định kỳ sinh đúng một kỳ kế tiếp, khi nó Hoàn thành HOẶC khi kỳ kế tiếp đã tới.
 */
export function shouldSpawn(t: Task, today: string): boolean {
  if (!t.recurrence || t.recurrenceSpawned) return false;
  if (t.status === "done") return true;
  const occ = nextOccurrence(t, today);
  return !!occ && (occ.startDate ?? occ.dueDate) <= today;
}

/** Các ngày đến hạn của một chuỗi định kỳ trong khoảng [from, to] (dùng cho dự báo) */
export function projectOccurrences(t: Task, from: string, to: string): string[] {
  if (!t.recurrence || t.recurrenceSpawned) return [];
  const out: string[] = [];
  let due = t.dueDate ?? from;
  for (let i = 0; i < 400 && due <= to; i++) {
    due = nextDue(due, t.recurrence);
    if (due >= from && due <= to) out.push(due);
  }
  return out;
}

/* ---------------- Thống kê Dashboard ---------------- */

export interface DashboardStats {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  due3: number;
  due7: number;
  progress: number;
  onTimeRate: number | null;
  forecast: { label: string; count: number }[];
  leaderboard: { user: User; done: number; onTime: number; overdue: number; open: number; score: number }[];
  departments: { name: string; todo: number; in_progress: number; on_hold: number; done: number; total: number }[];
}

export function onTime(t: Task): boolean {
  return t.status === "done" && (!t.dueDate || (t.completedAt ?? "").slice(0, 10) <= t.dueDate);
}

export function computeStats(all: Task[], users: User[], from: string, to: string, today: string): DashboardStats {
  const period = all.filter((t) => inPeriod(t, from, to));
  const done = period.filter((t) => t.status === "done");
  const doneWithDue = done.filter((t) => t.dueDate);

  // Dự báo tháng tới: việc chưa xong có hạn trong tháng tới + kỳ định kỳ sẽ sinh ra, chia theo tuần
  const nmFrom = addMonths(today.slice(0, 8) + "01", 1);
  const nmTo = addDays(addMonths(nmFrom, 1), -1);
  const dues: string[] = [];
  for (const t of all) {
    if (t.status !== "done" && t.dueDate && t.dueDate >= nmFrom && t.dueDate <= nmTo) dues.push(t.dueDate);
    dues.push(...projectOccurrences(t, nmFrom, nmTo));
  }
  const forecast: { label: string; count: number }[] = [];
  for (let w = startOfWeek(nmFrom); w <= nmTo; w = addDays(w, 7)) {
    const we = addDays(w, 6);
    forecast.push({
      label: `${w.slice(8, 10)}/${w.slice(5, 7)}`,
      count: dues.filter((d) => d >= w && d <= we).length,
    });
  }

  const leaderboard = users
    .map((u) => {
      const mine = period.filter((t) => t.assigneeId === u.id);
      const d = mine.filter((t) => t.status === "done");
      const ot = d.filter(onTime).length;
      const od = mine.filter((t) => isOverdue(t, today)).length;
      return { user: u, done: d.length, onTime: ot, overdue: od, open: mine.length - d.length, score: d.length * 10 + ot * 5 - od * 5 };
    })
    .filter((r) => r.done + r.open > 0)
    .sort((a, b) => b.score - a.score);

  const deptNames = Array.from(new Set(period.map((t) => t.department)));
  const departments = deptNames
    .map((name) => {
      const ts = period.filter((t) => t.department === name);
      return {
        name,
        todo: ts.filter((t) => t.status === "todo").length,
        in_progress: ts.filter((t) => t.status === "in_progress").length,
        on_hold: ts.filter((t) => t.status === "on_hold").length,
        done: ts.filter((t) => t.status === "done").length,
        total: ts.length,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    total: period.length,
    done: done.length,
    inProgress: period.filter((t) => t.status === "in_progress").length,
    overdue: all.filter((t) => isOverdue(t, today)).length,
    due3: all.filter((t) => isDueWithin(t, today, 3)).length,
    due7: all.filter((t) => isDueWithin(t, today, 7)).length,
    progress: period.length ? Math.round(period.reduce((s, t) => s + progressOf(t), 0) / period.length) : 0,
    onTimeRate: doneWithDue.length ? Math.round((doneWithDue.filter(onTime).length / doneWithDue.length) * 100) : null,
    forecast,
    leaderboard,
    departments,
  };
}

/** Tên người được nhắc trong bình luận, dạng "@Họ Tên" */
export function findMentions(text: string, users: User[]): User[] {
  return users.filter((u) => text.includes("@" + u.name));
}

/**
 * Mã ngắn 5 ký tự của một việc, để nhắn Zalo gắn ảnh vào đúng việc.
 * Ví dụ: gửi ảnh cho bot kèm chú thích "#K7Q2M" → ảnh thành link kết quả của việc có mã K7Q2M.
 */
export function taskCode(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 60466176).toString(36).toUpperCase().padStart(5, "0");
}
