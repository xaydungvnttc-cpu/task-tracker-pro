import { inPeriod, isOverdue, onTime } from "./tasks";
import type { Task } from "./types";

export interface KpiRow {
  key: string;
  label: string;
  sub?: string;
  total: number; // việc có thời gian nằm trong kỳ
  done: number;
  onTimeRate: number | null; // % xong đúng hạn trên số việc đã xong có hạn chót
  overdue: number; // đang quá hạn tính tới hôm nay
  score: number;
}

/**
 * Chấm điểm theo nhóm (người, phòng ban, dự án) trong một kỳ.
 * Điểm = Xong×10 + Đúng hạn×5 − Quá hạn×5, giống bảng xếp hạng ở Tổng quan.
 * Ví dụ: tháng này anh Dũng xong 12 việc, 10 việc đúng hạn, còn 1 việc quá hạn → 120 + 50 − 5 = 165 điểm.
 */
export function groupKpi(
  tasks: Task[],
  groups: { key: string; label: string; sub?: string }[],
  keyOf: (t: Task) => string | null | undefined,
  from: string,
  to: string,
  today: string,
): KpiRow[] {
  const inRange = tasks.filter((t) => inPeriod(t, from, to));
  return groups
    .map((g) => {
      const mine = inRange.filter((t) => keyOf(t) === g.key);
      const done = mine.filter((t) => t.status === "done");
      const withDue = done.filter((t) => t.dueDate);
      const ot = withDue.filter(onTime).length;
      const overdue = tasks.filter((t) => keyOf(t) === g.key && isOverdue(t, today)).length;
      return {
        ...g,
        total: mine.length,
        done: done.length,
        onTimeRate: withDue.length ? Math.round((ot / withDue.length) * 100) : null,
        overdue,
        score: done.length * 10 + ot * 5 - overdue * 5,
      };
    })
    .filter((r) => r.total + r.overdue > 0)
    .sort((a, b) => b.score - a.score);
}

/** Xuất CSV mở được bằng Excel (có BOM để giữ dấu tiếng Việt) */
export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
