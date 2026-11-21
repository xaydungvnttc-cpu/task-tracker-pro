import "server-only";
import { STATUS_LABEL } from "../constants";
import { addDays, formatDate, startOfWeek } from "../dates";
import { projectHealth } from "../projects";
import { RULES, managersOf, watchList } from "../reminders";
import { RISK_LABEL, companyRisks } from "../early-warning";
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
      ...riskSection(projects, tasks, today),
      ...directiveSection(open, users, today),
      { heading: `Quá hạn (${overdue.length})`, tone: "red", lines: overdue.map((t) => line(t, users, ` · trễ ${-daysLeft(t, today)!} ngày`)) },
      { heading: `Đến hạn hôm nay (${dueToday.length})`, tone: "yellow", lines: dueToday.map((t) => line(t, users)) },
      { heading: `Sắp đến hạn 3 ngày tới (${soon.length})`, tone: "gray", lines: soon.map((t) => line(t, users)) },
      ...watchSections(tasks, users, today),
    ],
    url: appUrl() ? `${appUrl()}/today` : undefined,
  };
}

/** Cảnh báo sớm: dự án có nguy cơ chậm và việc nên làm ngay. Ví dụ "PN Nguy cơ cao: Mốc chậm 10 ngày → Bổ sung tổ đội…" */
function riskSection(projects: Project[], tasks: Task[], today: string): OutgoingMessage["sections"] {
  const risks = companyRisks(projects, tasks, today);
  if (!risks.length) return [];
  return [
    {
      heading: `🚨 Cảnh báo sớm (${risks.length} dự án)`,
      tone: "red",
      lines: risks.flatMap((r) => [`${r.project.code} ${RISK_LABEL[r.level]}: ${r.signals.slice(0, 2).join("; ")}`, ...r.actions.slice(0, 2).map((a) => `→ ${a.text}`)]),
    },
  ];
}

function directiveSection(open: Task[], users: User[], today: string): OutgoingMessage["sections"] {
  const late = open.filter((t) => t.directive && isOverdue(t, today));
  return late.length ? [{ heading: `Chỉ đạo quá hạn (${late.length})`, tone: "red", lines: late.map((t) => line(t, users, ` · trễ ${-daysLeft(t, today)!} ngày`)) }] : [];
}

/** Việc dễ bị sót: leo thang, chưa giao người, lâu không cập nhật. Nhóm nào trống thì không hiện */
function watchSections(tasks: Task[], users: User[], today: string): OutgoingMessage["sections"] {
  const w = watchList(tasks, today);
  const late = (t: Task) => ` · trễ ${-daysLeft(t, today)!} ngày`;
  return [
    { heading: `⚠️ Báo Ban TGĐ: trễ từ ${RULES.escalateOwner} ngày (${w.escalateOwner.length})`, tone: "red" as const, lines: w.escalateOwner.map((t) => line(t, users, late(t))) },
    { heading: `Chưa có người nhận (${w.unassigned.length})`, tone: "yellow" as const, lines: w.unassigned.map((t) => line(t, users)) },
    { heading: `Đang làm nhưng ${RULES.staleDays} ngày chưa cập nhật (${w.stale.length})`, tone: "gray" as const, lines: w.stale.map((t) => line(t, users)) },
  ].filter((x) => x.lines.length);
}

/**
 * Bản nhắc riêng từng người qua Zalo: chỉ việc của mình (và việc trễ của phòng nếu là quản lý).
 * Ví dụ kỹ sư QS nhận: quá hạn 1 việc, hôm nay 2 việc, 3 ngày tới 1 việc. Không có gì thì không gửi.
 */
export function personalDigest(u: User, tasks: Task[], users: User[], today: string): OutgoingMessage | null {
  const mine = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done");
  const overdue = mine.filter((t) => isOverdue(t, today));
  const dueToday = mine.filter((t) => t.dueDate === today);
  const soon = mine.filter((t) => {
    const d = daysLeft(t, today);
    return d !== null && d >= 1 && d <= 3;
  });
  const w = watchList(tasks, today);
  const team = u.role === "manager" ? w.escalateManager.filter((t) => managersOf(t, users).some((m) => m.id === u.id)) : [];
  if (!overdue.length && !dueToday.length && !soon.length && !team.length) return null;
  const late = (t: Task) => ` · trễ ${-daysLeft(t, today)!} ngày`;
  return {
    title: `☀️ Việc của ${u.name} ngày ${formatDate(today, true)}`,
    sections: [
      { heading: `Quá hạn (${overdue.length})`, tone: "red" as const, lines: overdue.map((t) => line(t, users, late(t))) },
      { heading: `Hạn hôm nay (${dueToday.length})`, tone: "yellow" as const, lines: dueToday.map((t) => line(t, users)) },
      { heading: `3 ngày tới (${soon.length})`, tone: "gray" as const, lines: soon.map((t) => line(t, users)) },
      { heading: `Việc trễ của phòng cần đôn đốc (${team.length})`, tone: "red" as const, lines: team.map((t) => line(t, users, late(t))) },
    ].filter((x) => x.lines.length),
    url: appUrl() ? `${appUrl()}/today` : undefined,
  };
}

/** Nhắc cuối ngày 16:00: việc hạn hôm nay chưa xong, còn kịp xử lý trước khi hết ngày */
export function afternoonCheck(tasks: Task[], users: User[], today: string): OutgoingMessage | null {
  const due = tasks.filter((t) => t.status !== "done" && t.dueDate === today);
  if (!due.length) return null;
  return {
    title: `⏰ 16:00 còn ${due.length} việc hạn hôm nay chưa xong`,
    sections: [{ tone: "yellow", lines: due.map((t) => line(t, users)) }],
    url: appUrl() ? `${appUrl()}/today` : undefined,
  };
}

/** Báo cáo tổng kết tuần, 20:00 Chủ nhật */
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
