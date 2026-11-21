import "server-only";
import { STATUS_LABEL } from "../constants";
import { addDays, formatDate, startOfWeek } from "../dates";
import { projectHealth } from "../projects";
import { daysLeft, isOverdue, onTime } from "../tasks";
import type { NotifyEvent, OutgoingMessage, Project, Task, User } from "../types";
import { appUrl } from "./context";

const who = (t: Task, users: User[]) => users.find((u) => u.id === t.assigneeId)?.name ?? "Chưa gán";
const line = (t: Task, users: User[], extra = "") => `${t.title} · ${who(t, users)}${t.dueDate ? ` · hạn ${formatDate(t.dueDate)}` : ""}${extra}`;
const taskUrl = (t: Task) => (appUrl() ? `${appUrl()}/tasks?open=${t.id}` : undefined);

export function eventMessage(e: NotifyEvent): OutgoingMessage {
  const t = e.task;
  const due = t.dueDate ? `Hạn chót: ${formatDate(t.dueDate, true)}` : "Không giới hạn thời gian";
  const prio = [t.important && "Quan trọng", t.urgent && "Khẩn cấp"].filter(Boolean).join(", ") || "Bình thường";
  switch (e.type) {
    case "taskAssigned":
      return {
        title: `📌 Việc mới cho ${e.assigneeName}`,
        sections: [{ lines: [t.title, `Người giao: ${e.actorName}`, due, `Mức độ: ${prio}`, `Phòng ban: ${t.department}`] }],
        url: taskUrl(t),
      };
    case "mention":
      return {
        title: `💬 ${e.actorName} nhắc tên ${e.mentionedNames.join(", ")}`,
        sections: [{ lines: [`Trong việc: ${t.title}`, `"${e.text.slice(0, 300)}"`] }],
        url: taskUrl(t),
      };
    case "statusChange":
      return {
        title: e.to === "done" ? `✅ Hoàn thành: ${t.title}` : `⏸️ Tạm dừng: ${t.title}`,
        sections: [
          {
            tone: e.to === "done" ? "green" : "yellow",
            lines: [`${e.actorName}: ${STATUS_LABEL[e.from]} → ${STATUS_LABEL[e.to]}`, due, ...t.outputLinks.map((l) => `Bàn giao: ${l.label || "link"} ${l.url}`)],
          },
        ],
        url: taskUrl(t),
      };
  }
}

const LIGHT = { red: "🔴", yellow: "🟡", green: "🟢" } as const;

/** Một dòng mỗi dự án đang chạy, dự án đỏ lên trước. Ví dụ: "🔴 PN Nhà xưởng Phố Nối: Mốc "Lắp dựng thép" chậm 10 ngày; 5 việc quá hạn" */
function projectLines(projects: Project[], tasks: Task[], today: string): string[] {
  const order = ["red", "yellow", "green"];
  return projects
    .filter((p) => p.status === "active")
    .map((p) => projectHealth(p, tasks, today))
    .sort((a, b) => order.indexOf(a.health) - order.indexOf(b.health))
    .map((h) => `${LIGHT[h.health]} ${h.project.code} ${h.project.name}: ${h.reasons.length ? h.reasons.slice(0, 2).join("; ") : "đúng tiến độ"}`);
}

/** Nhắc việc 8:00 sáng */
export function dailyDigest(tasks: Task[], users: User[], today: string, projects: Project[] = []): OutgoingMessage {
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => isOverdue(t, today)).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const dueToday = open.filter((t) => t.dueDate === today);
  const soon = open.filter((t) => {
    const d = daysLeft(t, today);
    return d !== null && d >= 1 && d <= 3;
  });
  return {
    title: `☀️ Nhắc việc ngày ${formatDate(today, true)}`,
    sections: [
      ...(projects.length ? [{ heading: "Tình hình dự án", lines: projectLines(projects, tasks, today) }] : []),
      ...directiveSection(open, users, today),
      { heading: `Quá hạn (${overdue.length})`, tone: "red", lines: overdue.map((t) => line(t, users, ` · trễ ${-daysLeft(t, today)!} ngày`)) },
      { heading: `Đến hạn hôm nay (${dueToday.length})`, tone: "yellow", lines: dueToday.map((t) => line(t, users)) },
      { heading: `Sắp đến hạn 3 ngày tới (${soon.length})`, tone: "gray", lines: soon.map((t) => line(t, users)) },
    ],
    url: appUrl() ? `${appUrl()}/today` : undefined,
  };
}

/** Báo cáo tổng kết tuần, 20:00 Chủ nhật */
function directiveSection(open: Task[], users: User[], today: string): OutgoingMessage["sections"] {
  const late = open.filter((t) => t.directive && isOverdue(t, today));
  return late.length ? [{ heading: `Chỉ đạo quá hạn (${late.length})`, tone: "red", lines: late.map((t) => line(t, users, ` · trễ ${-daysLeft(t, today)!} ngày`)) }] : [];
}

export function weeklyReport(tasks: Task[], users: User[], today: string, projects: Project[] = []): OutgoingMessage {
  const ws = startOfWeek(today);
  const we = addDays(ws, 6);
  const doneWeek = tasks.filter((t) => t.status === "done" && t.completedAt && t.completedAt.slice(0, 10) >= ws && t.completedAt.slice(0, 10) <= we);
  const withDue = doneWeek.filter((t) => t.dueDate);
  const rate = withDue.length ? Math.round((withDue.filter(onTime).length / withDue.length) * 100) : null;
  const backlog = tasks.filter((t) => isOverdue(t, today));
  const nws = addDays(ws, 7);
  const nwe = addDays(ws, 13);
  const plan = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate >= nws && t.dueDate <= nwe).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));

  const byUser = users
    .map((u) => ({ u, n: doneWeek.filter((t) => t.assigneeId === u.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((x) => `${x.u.name}: ${x.n} việc`);

  return {
    title: `📊 Tổng kết tuần ${formatDate(ws)} – ${formatDate(we, true)}`,
    sections: [
      ...(projects.length ? [{ heading: "Tình hình dự án", lines: projectLines(projects, tasks, today) }] : []),
      { heading: "Kết quả", tone: "green", lines: [`Hoàn thành: ${doneWeek.length} việc`, `Tỷ lệ đúng hạn: ${rate === null ? "chưa có dữ liệu" : rate + "%"}`, ...byUser] },
      { heading: `Tồn đọng quá hạn (${backlog.length})`, tone: "red", lines: backlog.map((t) => line(t, users)) },
      { heading: `Kế hoạch tuần mới ${formatDate(nws)} – ${formatDate(nwe)} (${plan.length})`, tone: "gray", lines: plan.map((t) => line(t, users)) },
    ],
    url: appUrl() ? `${appUrl()}/dashboard` : undefined,
  };
}
