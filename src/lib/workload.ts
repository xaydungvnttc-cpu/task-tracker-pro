import { isProjectMember } from "./projects";
import { isOverdue } from "./tasks";
import type { Project, Task, User } from "./types";

/**
 * Cân đối tải việc: ai đang ôm quá nhiều, ai còn trống, và đề xuất chuyển bớt việc chưa bắt đầu.
 *
 * Ví dụ: Kỹ sư QS có 15 việc mở, 2 việc quá hạn, trong khi bình quân phòng là 6.
 * Hệ thống đề xuất chuyển việc "Lập dự toán phát sinh" (chưa làm, chưa quá hạn) cho người
 * cùng phòng đang có ít việc nhất, ưu tiên người thuộc cùng dự án.
 */

export type LoadLevel = "over" | "ok" | "free";

export interface LoadRow {
  user: User;
  open: number;
  overdue: number;
  level: LoadLevel;
}

export interface Move {
  task: Task;
  from: User;
  to: User;
  reason: string;
}

export const LOAD_LABEL: Record<LoadLevel, string> = { over: "Quá tải", ok: "Vừa sức", free: "Còn trống" };

/** Quá tải khi việc mở gấp rưỡi bình quân công ty (tối thiểu 8), hoặc từ 2 việc quá hạn trở lên */
export function workloadPlan(tasks: Task[], users: User[], projects: Project[], today: string): { rows: LoadRow[]; moves: Move[]; gaps: LoadRow[]; avg: number } {
  const staff = users.filter((u) => u.role !== "owner");
  const openOf = (uid: string) => tasks.filter((t) => t.assigneeId === uid && t.status !== "done");
  const base = staff.map((u) => {
    const open = openOf(u.id);
    return { user: u, open: open.length, overdue: open.filter((t) => isOverdue(t, today)).length };
  });
  const avg = base.length ? base.reduce((s, r) => s + r.open, 0) / base.length : 0;
  const overLimit = Math.max(8, Math.ceil(avg * 1.5));
  const rows: LoadRow[] = base
    .map((r) => ({ ...r, level: (r.open >= overLimit || r.overdue >= 2 ? "over" : r.open < avg * 0.6 ? "free" : "ok") as LoadLevel }))
    .sort((a, b) => b.open + b.overdue - (a.open + a.overdue));

  // Tải dự kiến sau khi chuyển, để không dồn hết việc cho một người
  const load = new Map(rows.map((r) => [r.user.id, r.open]));
  const moves: Move[] = [];
  for (const r of rows.filter((x) => x.level === "over")) {
    const movable = openOf(r.user.id)
      .filter((t) => t.status === "todo" && !t.directive && !isOverdue(t, today))
      .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
    for (const t of movable) {
      if ((load.get(r.user.id) ?? 0) <= avg + 2 || moves.filter((m) => m.from.id === r.user.id).length >= 3) break;
      const project = projects.find((p) => p.id === t.projectId);
      const candidates = rows
        .filter((c) => c.user.id !== r.user.id && c.level !== "over" && c.user.department === r.user.department)
        .filter((c) => !project || isProjectMember(project, c.user))
        .sort((a, b) => (load.get(a.user.id) ?? 0) - (load.get(b.user.id) ?? 0));
      const to = candidates[0];
      if (!to || (load.get(to.user.id) ?? 0) + 1 >= (load.get(r.user.id) ?? 0) - 1) continue;
      moves.push({
        task: t,
        from: r.user,
        to: to.user,
        reason: `${r.user.name} đang có ${load.get(r.user.id)} việc mở${r.overdue ? `, ${r.overdue} quá hạn` : ""}; ${to.user.name} cùng phòng${project ? ", cùng dự án" : ""}, đang có ${load.get(to.user.id)} việc`,
      });
      load.set(r.user.id, (load.get(r.user.id) ?? 0) - 1);
      load.set(to.user.id, (load.get(to.user.id) ?? 0) + 1);
    }
  }
  // Quá tải mà không chuyển được cho ai: phòng thiếu người, cần Ban TGĐ quyết bổ sung nhân sự hoặc giãn hạn
  const gaps = rows.filter((r) => r.level === "over" && (load.get(r.user.id) ?? 0) > avg + 2);
  return { rows, moves, gaps, avg };
}
