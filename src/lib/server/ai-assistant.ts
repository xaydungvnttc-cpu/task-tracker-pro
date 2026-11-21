import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { formatDate } from "../dates";
import { companyRisks } from "../early-warning";
import { projectHealth } from "../projects";
import { watchList } from "../reminders";
import { daysLeft, isOverdue } from "../tasks";
import type { Project, Task, User } from "../types";

/**
 * Trợ lý AI cho Ban TGĐ (chỉ chạy khi có biến ANTHROPIC_API_KEY).
 * Mỗi sáng đọc số liệu dự án, việc trễ, cảnh báo sớm rồi viết nhận định ngắn: việc gì cần chỉ đạo hôm nay, ai phụ trách.
 * Ví dụ đầu ra: "1. Phố Nối: lắp dựng thép chậm 10 ngày, yêu cầu anh Khánh trình kế hoạch bù tiến độ trước 17h…"
 */
const SYSTEM = `Bạn là trợ lý của Tổng Giám đốc một công ty xây dựng Việt Nam.
Đọc số liệu theo dõi công việc các dự án và viết nhận định buổi sáng bằng tiếng Việt, giọng văn công việc, ngắn gọn.
Yêu cầu:
- Tối đa 10 dòng đánh số, mỗi dòng một việc Tổng Giám đốc nên chỉ đạo hôm nay: nêu dự án, vấn đề, người phụ trách, hạn cụ thể.
- Ưu tiên việc có nguy cơ làm chậm mốc hợp đồng, an toàn lao động, dòng tiền.
- Chỉ dùng thông tin có trong số liệu, không bịa tên người hay con số.
- Không dùng markdown, không tiêu đề, không lời chào.`;

function brief(tasks: Task[], users: User[], projects: Project[], today: string): string {
  const name = (id: string | null) => users.find((u) => u.id === id)?.name ?? "chưa giao";
  const code = (id: string | null | undefined) => projects.find((p) => p.id === id)?.code ?? "VP";
  const lines: string[] = [`Hôm nay: ${formatDate(today, true)}`, "", "DỰ ÁN:"];
  for (const p of projects.filter((x) => x.status === "active")) {
    const h = projectHealth(p, tasks, today);
    lines.push(`- ${p.code} ${p.name} (GĐDA ${name(p.directorId)}, CHT ${name(p.siteManagerId)}): ${h.done}/${h.total} việc xong, ${h.overdue} quá hạn; ${h.reasons.join("; ") || "đúng tiến độ"}; mốc tới: ${h.nextMilestone ? `${h.nextMilestone.name} ${formatDate(h.nextMilestone.plannedDate, true)}` : "không"}`);
  }
  lines.push("", "CẢNH BÁO SỚM:");
  for (const r of companyRisks(projects, tasks, today)) lines.push(`- ${r.project.code}: ${r.signals.join("; ")}`);
  const overdue = tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)).slice(0, 40);
  lines.push("", "VIỆC QUÁ HẠN (cũ nhất trước):");
  for (const t of overdue) lines.push(`- [${code(t.projectId)}] ${t.title} · ${name(t.assigneeId)} · trễ ${-daysLeft(t, today)!} ngày${t.directive ? " · chỉ đạo TGĐ" : ""}${t.important ? " · quan trọng" : ""}`);
  const w = watchList(tasks, today);
  lines.push("", `Việc chưa có người nhận: ${w.unassigned.length}. Việc đang làm mà 7 ngày chưa cập nhật: ${w.stale.length}.`);
  return lines.join("\n");
}

export async function aiMorningBrief(tasks: Task[], users: User[], projects: Project[], today: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [{ role: "user", content: brief(tasks, users, projects, today) }],
  });
  if (res.stop_reason === "refusal") return null;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  return text || null;
}
