import "server-only";
import { ROLE_LABEL } from "../constants";
import { formatDate } from "../dates";
import { companyRisks } from "../early-warning";
import { projectHealth } from "../projects";
import { watchList } from "../reminders";
import { daysLeft, isOverdue } from "../tasks";
import type { Project, Task, User } from "../types";

/**
 * Trợ lý AI cho Ban TGĐ, dùng Gemini miễn phí của Google (chỉ chạy khi có mã Gemini ở Cài đặt hoặc secret GEMINI_API_KEY).
 * Mỗi sáng đọc số liệu dự án, việc trễ, cảnh báo sớm rồi viết nhận định ngắn: việc gì cần chỉ đạo hôm nay, ai phụ trách.
 * Ví dụ đầu ra: "1. Phố Nối: lắp dựng thép chậm 10 ngày, yêu cầu anh Khánh trình kế hoạch bù tiến độ trước 17h…"
 * Lưu ý: gói miễn phí giới hạn số lần gọi mỗi ngày và Google có thể dùng dữ liệu gửi lên để cải thiện AI,
 * nên không gửi tên nhân viên: mỗi người chỉ ghi chức danh (anh chủ chọn ngày 22/11/2026).
 */
const MODEL = "gemini-2.5-flash";
const API = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM = `Bạn là trợ lý của Tổng Giám đốc một công ty xây dựng Việt Nam.
Đọc số liệu theo dõi công việc các dự án và viết nhận định buổi sáng bằng tiếng Việt, giọng văn công việc, ngắn gọn.
Yêu cầu:
- Tối đa 10 dòng đánh số, mỗi dòng một việc Tổng Giám đốc nên chỉ đạo hôm nay: nêu dự án, vấn đề, người phụ trách, hạn cụ thể.
- Ưu tiên việc có nguy cơ làm chậm mốc hợp đồng, an toàn lao động, dòng tiền.
- Người phụ trách gọi theo chức danh có trong số liệu. Chỉ dùng thông tin có trong số liệu, không bịa con số.
- Không dùng markdown, không tiêu đề, không lời chào.`;

export function brief(tasks: Task[], users: User[], projects: Project[], today: string): string {
  // Giấu tên người: chỉ gửi chức danh, ví dụ "Chỉ huy trưởng Nhà xưởng Phố Nối" thay cho "Lý Thanh Tâm"
  const label = (u: User) => u.title || `${ROLE_LABEL[u.role]} ${u.department}`;
  const name = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? label(u) : "chưa giao";
  };
  const scrub = (text: string) => users.reduce((t, u) => (u.name ? t.split(u.name).join(label(u)) : t), text);
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
  for (const t of overdue) lines.push(`- [${code(t.projectId)}] ${scrub(t.title)} · ${name(t.assigneeId)} · trễ ${-daysLeft(t, today)!} ngày${t.directive ? " · chỉ đạo TGĐ" : ""}${t.important ? " · quan trọng" : ""}`);
  const w = watchList(tasks, today);
  lines.push("", `Việc chưa có người nhận: ${w.unassigned.length}. Việc đang làm mà 7 ngày chưa cập nhật: ${w.stale.length}.`);
  return lines.join("\n");
}

/** key: mã Gemini dán ở Cài đặt (ưu tiên) hoặc secret GEMINI_API_KEY trên GitHub */
export async function aiMorningBrief(tasks: Task[], users: User[], projects: Project[], today: string, key: string): Promise<string | null> {
  if (!key) return null;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: brief(tasks, users, projects, today) }] }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  return text || null;
}
