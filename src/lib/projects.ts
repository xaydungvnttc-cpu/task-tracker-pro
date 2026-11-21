import { diffDays } from "./dates";
import { isOverdue } from "./tasks";
import type { Milestone, Project, Task } from "./types";

export type Health = "green" | "yellow" | "red";

export const HEALTH_LABEL: Record<Health, string> = { green: "Bình thường", yellow: "Cần chú ý", red: "Báo động" };

/** Mốc chậm bao nhiêu ngày: đã xong thì so ngày thực tế, chưa xong mà quá ngày dự kiến thì tính tới hôm nay */
export function milestoneDelay(m: Milestone, today: string): number {
  if (m.actualDate) return Math.max(0, diffDays(m.actualDate, m.plannedDate));
  return m.plannedDate < today ? diffDays(today, m.plannedDate) : 0;
}

export interface ProjectHealth {
  project: Project;
  total: number;
  done: number;
  open: number;
  overdue: number;
  overdueImportant: number;
  directivesOpen: number;
  /** Chậm lớn nhất trong các mốc chưa xong hoặc vừa xong trễ */
  delayDays: number;
  nextMilestone: Milestone | null;
  progress: number; // % việc hoàn thành
  health: Health;
  reasons: string[];
}

/**
 * Đèn dự án. Ví dụ: mốc "Cất nóc" quá 10 ngày chưa xong → đỏ; có 2 việc quá hạn trên 40 việc đang mở → vàng.
 * Đỏ: mốc chậm trên 7 ngày, hoặc việc quá hạn từ 20% việc đang mở, hoặc từ 10 việc quan trọng quá hạn.
 * Vàng: có mốc chậm hoặc có việc quá hạn.
 */
export function projectHealth(project: Project, tasks: Task[], today: string): ProjectHealth {
  const ts = tasks.filter((t) => t.projectId === project.id);
  const done = ts.filter((t) => t.status === "done").length;
  const open = ts.length - done;
  const od = ts.filter((t) => isOverdue(t, today));
  const overdueImportant = od.filter((t) => t.important).length;
  const delays = project.milestones.map((m) => ({ m, d: milestoneDelay(m, today) }));
  const delayDays = Math.max(0, ...delays.filter((x) => !x.m.actualDate || x.d > 0).map((x) => x.d));
  const nextMilestone = [...project.milestones].filter((m) => !m.actualDate).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0] ?? null;

  const reasons: string[] = [];
  const late = delays.filter((x) => !x.m.actualDate && x.d > 0);
  late.forEach((x) => reasons.push(`Mốc "${x.m.name}" chậm ${x.d} ngày`));
  if (od.length) reasons.push(`${od.length} việc quá hạn${overdueImportant ? `, ${overdueImportant} việc quan trọng` : ""}`);

  let health: Health = "green";
  if (project.status === "active") {
    const maxLate = Math.max(0, ...late.map((x) => x.d));
    if (maxLate > 7 || (open > 0 && od.length / open >= 0.2) || overdueImportant >= 10) health = "red";
    else if (maxLate > 0 || od.length > 0) health = "yellow";
  }
  return {
    project,
    total: ts.length,
    done,
    open,
    overdue: od.length,
    overdueImportant,
    directivesOpen: ts.filter((t) => t.directive && t.status !== "done").length,
    delayDays,
    nextMilestone,
    progress: ts.length ? Math.round((done / ts.length) * 100) : 0,
    health,
    reasons,
  };
}

/** Lọc theo dự án đang chọn ở thanh trên cùng */
export function applyProject(tasks: Task[], filter: string): Task[] {
  if (filter === "all") return tasks;
  if (filter === "office") return tasks.filter((t) => !t.projectId);
  return tasks.filter((t) => t.projectId === filter);
}
