import { addDays, formatDate } from "../dates";
import type { Project, Task } from "../types";

/**
 * Tin nhắn Zalo gửi cho bot → việc trong app.
 * Ví dụ: chỉ huy trưởng nhắn "Gấp: SH thiếu thép D16 cho sàn tầng 6"
 * → tạo việc "Thiếu thép D16 cho sàn tầng 6", dự án Sông Hồng, Khẩn cấp, hạn ngày mai, chờ giao người.
 * Tin chào hỏi, cảm ơn thì không tạo việc.
 */

const URGENT = ["gấp", "khẩn", "ngay", "sự cố", "tai nạn", "cháy", "sập", "đổ sập", "bị thương", "nguy hiểm", "dừng thi công", "ngừng thi công"];
const IMPORTANT = [
  "việc", "cần", "phải", "yêu cầu", "đề nghị", "nhờ", "xử lý", "kiểm tra", "báo cáo", "giao", "hạn",
  "thiếu", "chậm", "trễ", "hỏng", "lỗi", "nứt", "thấm", "lún", "vi phạm", "ncr", "nghiệm thu", "thanh toán",
  "công nợ", "tạm ứng", "hợp đồng", "phát sinh", "vật tư", "thép", "bê tông", "xi măng", "an toàn", "chủ đầu tư", "tư vấn giám sát", "tvgs",
];
const PREFIX = /^\s*(việc|viec|gấp|gap|khẩn|khan|#viec|#việc|giao việc)\s*[:\-–]\s*/i;

const norm = (s: string) => s.toLowerCase().normalize("NFC");
const has = (text: string, words: string[]) => words.some((w) => new RegExp(`(^|[^\\p{L}])${w}($|[^\\p{L}])`, "u").test(text));

export function classify(text: string): { create: boolean; urgent: boolean } {
  const t = norm(text);
  const urgent = has(t, URGENT);
  if (PREFIX.test(text)) return { create: true, urgent };
  // Tin quá ngắn (chào, ok, cảm ơn) bỏ qua; tin có từ khóa công việc thì tạo việc
  if (t.replace(/\s+/g, " ").trim().length < 12) return { create: false, urgent: false };
  return { create: urgent || has(t, IMPORTANT), urgent };
}

/** Tìm dự án theo mã ngắn (SH, PN) hoặc tên ("Sông Hồng") trong tin nhắn */
export function detectProject(text: string, projects: Project[]): Project | undefined {
  const t = norm(text);
  return (
    projects.find((p) => p.code && new RegExp(`(^|[^\\p{L}\\p{N}])${p.code.toLowerCase()}($|[^\\p{L}\\p{N}])`, "u").test(t)) ??
    projects.find((p) => {
      const words = norm(p.name).split(/\s+/).filter((w) => w.length > 2);
      // khớp 2 từ liền nhau trong tên, ví dụ "sông hồng", "phố nối", "ngọc thụy"
      return words.some((w, i) => i < words.length - 1 && t.includes(`${w} ${words[i + 1]}`));
    })
  );
}

export function taskFromZalo(opts: {
  messageId: string;
  text: string;
  sender: string;
  urgent: boolean;
  projects: Project[];
  ownerId: string;
  today: string;
  nowIso: string;
}): Task {
  const body = opts.text.trim();
  const firstLine = body.replace(PREFIX, "").split(/\n/)[0].trim();
  const title = (firstLine.charAt(0).toUpperCase() + firstLine.slice(1)).slice(0, 120);
  const project = detectProject(body, opts.projects.filter((p) => p.status !== "done"));
  const due = addDays(opts.today, opts.urgent ? 1 : 3);
  return {
    id: `zalo-${opts.messageId}`,
    title,
    description: `${body}\n\nNguồn: tin Zalo của ${opts.sender}, ${formatDate(opts.today, true)}. Hạn tạm đặt, người giao việc chỉnh lại.`,
    projectId: project?.id ?? null,
    directive: false,
    assigneeId: null,
    watcherIds: [],
    department: "Ban Chỉ huy công trường",
    important: true,
    urgent: opts.urgent,
    timeType: "single",
    startDate: null,
    dueDate: due,
    status: "todo",
    checklist: [],
    inputLinks: [],
    outputLinks: [],
    requireOutput: false,
    recurrence: null,
    recurrenceSpawned: false,
    comments: [],
    completedAt: null,
    createdBy: opts.ownerId,
    createdAt: opts.nowIso,
    updatedAt: opts.nowIso,
  };
}
