import { addDays, diffDays } from "./dates";
import { projectHealth } from "./projects";
import { isOverdue } from "./tasks";
import type { Project, Task } from "./types";

/**
 * Cảnh báo sớm: phát hiện dự án có nguy cơ chậm TRƯỚC khi thành chuyện đã rồi, kèm phương án xử lý đề xuất.
 * Ví dụ: Phố Nối có mốc "Lợp mái" còn 12 ngày, 2 tuần tới phải xong 9 việc trong khi 2 tuần qua chỉ xong 3 việc
 * → nguy cơ trễ mốc; việc trễ chủ yếu về vật tư → đề xuất "Họp nhà cung cấp, chốt lịch giao hàng bằng văn bản".
 */

export type RiskLevel = "high" | "medium";
export const RISK_LABEL: Record<RiskLevel, string> = { high: "Nguy cơ cao", medium: "Cần theo dõi" };

export interface Action {
  text: string;
  /** Hạn đề xuất tính từ hôm nay */
  inDays: number;
}

export interface ProjectRisk {
  project: Project;
  level: RiskLevel;
  signals: string[];
  actions: Action[];
}

/** Nhóm vấn đề hay gặp trong xây dựng và phương án xử lý mẫu */
const PLAYBOOK: { key: string; label: string; re: RegExp; actions: Action[] }[] = [
  {
    key: "material",
    label: "vật tư, thiết bị",
    re: /vật tư|thép|bê tông|xi măng|đặt hàng|nhập kho|nhà cung cấp|tôn|cẩu|thiết bị|giao hàng/i,
    actions: [
      { text: "Họp nhà cung cấp, chốt lịch giao hàng bằng văn bản, phạt chậm theo hợp đồng", inDays: 2 },
      { text: "Tìm nhà cung cấp dự phòng, lấy báo giá giao gấp", inDays: 3 },
    ],
  },
  {
    key: "payment",
    label: "hồ sơ, thanh toán",
    re: /thanh toán|tạm ứng|hồ sơ|quyết toán|công nợ|khối lượng|hợp đồng|phụ lục/i,
    actions: [
      { text: "QS và Ban chỉ huy rà hồ sơ chung một buổi, nộp Chủ đầu tư trong 3 ngày", inDays: 3 },
      { text: "Gửi công văn đề nghị Chủ đầu tư xác nhận khối lượng, giải ngân", inDays: 5 },
    ],
  },
  {
    key: "quality",
    label: "chất lượng, nghiệm thu",
    re: /nghiệm thu|ncr|nứt|thấm|sai lệch|thí nghiệm|kiểm tra|siêu âm/i,
    actions: [
      { text: "QA/QC lập kế hoạch nghiệm thu cuốn chiếu, mời TVGS theo lịch cố định", inDays: 2 },
      { text: "Đóng các phiếu NCR tồn: giao người, hạn, ảnh trước và sau khắc phục", inDays: 5 },
    ],
  },
  {
    key: "safety",
    label: "an toàn lao động",
    re: /an toàn|hse|atlđ|pccc|cứu sinh|lan can|điện tạm|tai nạn/i,
    actions: [{ text: "Dừng hạng mục rủi ro, kiểm tra an toàn toàn công trường, lập biên bản", inDays: 1 }],
  },
  {
    key: "workforce",
    label: "nhân lực, thầu phụ",
    re: /tổ|nhân lực|thầu phụ|lắp dựng|tăng ca|đội/i,
    actions: [
      { text: "Bổ sung tổ đội hoặc tăng ca, chốt số người cụ thể theo từng ngày", inDays: 2 },
      { text: "Đánh giá thầu phụ, gửi văn bản cảnh báo; chuẩn bị thầu phụ thay thế", inDays: 5 },
    ],
  },
];

const done14 = (ts: Task[], today: string) => ts.filter((t) => t.status === "done" && t.completedAt && diffDays(today, t.completedAt.slice(0, 10)) <= 14).length;

export function projectRisk(project: Project, tasks: Task[], today: string): ProjectRisk | null {
  if (project.status !== "active") return null;
  const ts = tasks.filter((t) => t.projectId === project.id);
  const open = ts.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => isOverdue(t, today));
  const h = projectHealth(project, tasks, today);
  const signals: string[] = [];
  let score = 0;

  // 1. Mốc đã chậm
  if (h.delayDays > 0) {
    signals.push(`Mốc chậm ${h.delayDays} ngày`);
    score += h.delayDays > 7 ? 3 : 2;
  }
  // 2. Mốc sắp tới trong 21 ngày mà đang tồn việc quá hạn
  const nm = h.nextMilestone;
  const toMilestone = nm ? diffDays(nm.plannedDate, today) : null;
  if (nm && toMilestone !== null && toMilestone >= 0 && toMilestone <= 21 && overdue.length >= 2) {
    signals.push(`Mốc "${nm.name}" còn ${toMilestone} ngày nhưng đang tồn ${overdue.length} việc quá hạn`);
    score += 2;
  }
  // 3. Khối lượng 2 tuần tới vượt năng lực 2 tuần qua
  const next14 = open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 14)).length;
  const pace = done14(ts, today);
  if (next14 >= 5 && next14 > pace * 1.5) {
    signals.push(`2 tuần tới phải xong ${next14} việc, 2 tuần qua chỉ xong ${pace} việc`);
    score += 2;
  }
  // 4. Việc quan trọng và gấp đang trễ
  const critical = overdue.filter((t) => t.important && t.urgent).length;
  if (critical >= 2) {
    signals.push(`${critical} việc quan trọng và gấp đang trễ`);
    score += 1;
  }
  // 5. Việc trễ lâu (từ 5 ngày)
  const longLate = overdue.filter((t) => diffDays(today, t.dueDate!) >= 5).length;
  if (longLate) {
    signals.push(`${longLate} việc trễ từ 5 ngày trở lên`);
    score += 1;
  }
  if (!signals.length) return null;

  // Phương án: theo nhóm vấn đề chiếm nhiều việc trễ nhất, cộng việc chung khi nguy cơ cao
  const groups = PLAYBOOK.map((g) => ({ g, n: overdue.filter((t) => g.re.test(t.title)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2);
  const level: RiskLevel = score >= 4 ? "high" : "medium";
  const actions: Action[] = [];
  if (level === "high") actions.push({ text: "Giám đốc dự án lập kế hoạch bù tiến độ, trình Ban TGĐ duyệt", inDays: 2 });
  groups.forEach(({ g, n }) => {
    signals.push(`Việc trễ nhiều nhất về ${g.label} (${n} việc)`);
    actions.push(...g.actions);
  });
  if (!groups.length) actions.push({ text: "Họp giao ban rà toàn bộ việc trễ, giao lại người và hạn mới", inDays: 1 });
  return { project, level, signals, actions: actions.slice(0, 4) };
}

/** Toàn công ty, dự án nguy cơ cao lên đầu */
export function companyRisks(projects: Project[], tasks: Task[], today: string): ProjectRisk[] {
  return projects
    .map((p) => projectRisk(p, tasks, today))
    .filter((r): r is ProjectRisk => !!r)
    .sort((a, b) => (a.level === b.level ? b.signals.length - a.signals.length : a.level === "high" ? -1 : 1));
}
