import { addDays, addMonths, diffDays } from "./dates";
import type { Task } from "./types";

/**
 * Dữ liệu mẫu "đã chạy từ đầu năm": sinh các việc ĐÃ HOÀN THÀNH theo từng tuần, từng tháng của mỗi dự án,
 * để báo cáo, KPI, biểu đồ có số liệu thay vì bằng 0.
 * Ví dụ tuần thứ 20 của Sông Hồng đang làm "sàn tầng 2" → sinh "Nghiệm thu cốt thép sàn tầng 2" (Phạm Minh Dũng, xong đúng hạn),
 * "Đổ bê tông sàn tầng 2", "Báo cáo tuần 20 gửi Chủ đầu tư"; mỗi tháng thêm hồ sơ thanh toán, huấn luyện an toàn, kế hoạch vật tư.
 * Khoảng 1/9 số việc xong trễ 1-3 ngày, kèm bình luận lý do, để tỷ lệ đúng hạn trông như thật.
 */

type Kind = "prep" | "coc" | "bt" | "thep";
type Role = "mgr" | "eng" | "survey" | "qa" | "hse" | "qs" | "mat" | "mep" | "steel" | "dir";

interface HistoryProject {
  id: string;
  code: string;
  start: number; // số ngày so với hôm nay (âm)
  roles: Partial<Record<Role, string>> & { mgr: string; eng: string };
  packages: [Kind, string][];
  /** Vài tuần gần đây hay trễ hạn (ví dụ Phố Nối thiếu thép) */
  slowLastWeeks?: number;
}

const DEPT: Record<Role, string> = {
  mgr: "Ban Chỉ huy công trường",
  dir: "Ban Chỉ huy công trường",
  eng: "Kỹ thuật thi công",
  survey: "Kỹ thuật thi công",
  mep: "Kỹ thuật thi công",
  steel: "Kỹ thuật thi công",
  qa: "An toàn - Chất lượng (HSE, QA/QC)",
  hse: "An toàn - Chất lượng (HSE, QA/QC)",
  qs: "Hợp đồng - Thanh toán (QS)",
  mat: "Kế hoạch - Vật tư",
};

const TEMPLATES: Record<Kind, [Role, (p: string) => string, string[]?][]> = {
  prep: [
    ["survey", (p) => `Đo đạc hiện trạng, cắm mốc ${p}`],
    ["eng", (p) => `Lập biện pháp thi công ${p}`, ["Lập biện pháp", "Trình TVGS", "Sửa theo ý kiến", "Được duyệt"]],
    ["mgr", (p) => `Thi công ${p}`],
    ["hse", (p) => `Kiểm tra an toàn, biển báo khu vực ${p}`],
  ],
  coc: [
    ["eng", (p) => `Nghiệm thu lồng thép ${p}`, ["Tự kiểm tra", "Mời TVGS", "Ký biên bản"]],
    ["mgr", (p) => `Khoan và đổ bê tông ${p}`],
    ["qa", (p) => `Siêu âm kiểm tra chất lượng ${p}`],
    ["survey", (p) => `Định vị tim cọc ${p}`],
    ["hse", (p) => `Kiểm tra an toàn máy khoan, điện tạm ${p}`],
    ["mat", (p) => `Nhập thép và bê tông cho ${p}`],
  ],
  bt: [
    ["survey", (p) => `Trắc đạc, định vị trục ${p}`],
    ["eng", (p) => `Nghiệm thu cốt thép ${p}`, ["Tự kiểm tra nội bộ", "Mời TVGS", "Ký biên bản nghiệm thu"]],
    ["mgr", (p) => `Đổ bê tông ${p}`, ["Nghiệm thu ván khuôn, cốt thép", "Đặt bê tông thương phẩm", "Đổ và bảo dưỡng"]],
    ["qa", (p) => `Ép mẫu bê tông 7 ngày ${p}`],
    ["mat", (p) => `Nhập thép, ván khuôn cho ${p}`],
    ["mep", (p) => `Nghiệm thu ống chờ điện nước ${p}`],
    ["hse", (p) => `Kiểm tra an toàn giàn giáo khu vực ${p}`],
    ["eng", (p) => `Nghiệm thu ván khuôn ${p}`],
  ],
  thep: [
    ["steel", (p) => `Nghiệm thu gia công ${p} tại xưởng`, ["Kiểm tra kích thước", "Kiểm tra mối hàn", "Ký biên bản xuất xưởng"]],
    ["mat", (p) => `Nhập kết cấu thép ${p} về công trường`],
    ["mgr", (p) => `Lắp dựng ${p}`],
    ["eng", (p) => `Nghiệm thu bu lông neo, chân cột trước khi lắp ${p}`],
    ["qa", (p) => `Kiểm tra bu lông, mối hàn ${p}`],
    ["hse", (p) => `Kiểm tra an toàn làm việc trên cao khi lắp ${p}`],
    ["survey", (p) => `Kiểm tra độ thẳng đứng cột, cao độ ${p}`],
  ],
};

const LATE_REASONS = ["mưa lớn kéo dài", "nhà cung cấp giao vật tư chậm", "TVGS hẹn lại lịch nghiệm thu", "thiếu nhân công tổ đội", "chờ Chủ đầu tư duyệt bản vẽ"];

export const HISTORY_PROJECTS: HistoryProject[] = [
  {
    id: "p1", code: "SH", start: -321,
    roles: { mgr: "u2", eng: "u4", survey: "u10", qa: "u7", hse: "u9", qs: "u5", mat: "u6", mep: "u8", dir: "u2" },
    packages: [
      ["prep", "mặt bằng, lán trại"], ["coc", "cọc thử"], ["coc", "cọc đại trà khu A"], ["coc", "cọc đại trà khu B"],
      ["bt", "đài móng khối A"], ["bt", "đài móng khối B"], ["bt", "sàn tầng hầm"], ["bt", "cột vách tầng 1"], ["bt", "sàn tầng 1"],
      ["bt", "cột vách tầng 2"], ["bt", "sàn tầng 2"], ["bt", "cột tầng 3"], ["bt", "sàn tầng 3"], ["bt", "cột tầng 4"], ["bt", "sàn tầng 4"], ["bt", "cột tầng 5"],
    ],
  },
  {
    id: "p2", code: "PN", start: -290, slowLastWeeks: 3,
    roles: { mgr: "u12", eng: "u14", survey: "u14", steel: "u15", qa: "u7", hse: "u9", qs: "u5", mat: "u6", dir: "u11" },
    packages: [
      ["prep", "san nền khu xưởng"], ["bt", "móng cột trục 1-6"], ["bt", "móng cột trục 7-12"], ["bt", "giằng móng"], ["bt", "nền xưởng khu A"],
      ["thep", "cột thép trục 1-6"], ["thep", "kèo thép trục 1-4"], ["thep", "kèo thép trục 5-8"], ["thep", "kèo thép trục 9-12"],
    ],
  },
  {
    id: "p3", code: "NT", start: -260,
    roles: { mgr: "u13", eng: "u16", survey: "u17", qa: "u7", hse: "u9", qs: "u5", mat: "u6", dir: "u11" },
    packages: [
      ["prep", "rào chắn, lán trại"], ["prep", "giải phóng mặt bằng khu nhà học"], ["prep", "đường tạm, cổng công trường"],
      ["coc", "cọc thử"], ["coc", "cọc khoan nhồi đợt 1"],
    ],
  },
];

export function buildHistory(today: string, base: (p: Partial<Task> & Pick<Task, "id" | "title">) => Task): Task[] {
  const out: Task[] = [];
  const d = (n: number) => addDays(today, n);
  const iso = (day: string, h: number) => `${day}T${String(h).padStart(2, "0")}:00:00.000Z`;
  let n = 0;
  let ck = 0;

  const push = (o: { title: string; who: string; dept: string; due: string; projectId: string | null; seed: number; items?: string[]; createdBy?: string; directive?: boolean; important?: boolean; lateBoost?: boolean }) => {
    if (diffDays(today, o.due) < 2) return; // chỉ sinh việc đã qua
    const late = o.lateBoost ? o.seed % 2 === 0 : o.seed % 9 === 0;
    const lateDays = late ? 1 + (o.seed % 3) : 0;
    const doneDay = addDays(o.due, late ? lateDays : -(o.seed % 2));
    const id = `h${++n}`;
    out.push(
      base({
        id,
        title: o.title,
        assigneeId: o.who,
        department: o.dept,
        important: o.important ?? o.seed % 3 !== 0,
        urgent: o.seed % 4 === 0,
        timeType: "single",
        dueDate: o.due,
        status: "done",
        completedAt: iso(doneDay, 9 + (o.seed % 8)),
        projectId: o.projectId,
        directive: !!o.directive,
        createdBy: o.createdBy ?? "u2",
        createdAt: iso(addDays(o.due, -7), 2),
        updatedAt: iso(doneDay, 10),
        checklist: (o.items ?? []).map((text) => ({ id: `hc${++ck}`, text, done: true })),
        comments: late
          ? [{ id: `${id}-c`, userId: o.who, text: `Xong chậm ${lateDays} ngày do ${LATE_REASONS[o.seed % LATE_REASONS.length]}, đã báo Ban chỉ huy.`, createdAt: iso(doneDay, 11) }]
          : [],
      }),
    );
  };

  HISTORY_PROJECTS.forEach((p, pi) => {
    const weeks = Math.floor(-p.start / 7);
    const who = (r: Role) => p.roles[r] ?? p.roles.eng;
    for (let w = 0; w < weeks; w++) {
      const ws = d(p.start + w * 7);
      const pkg = p.packages[Math.min(p.packages.length - 1, Math.floor((w / weeks) * p.packages.length))];
      const tpl = TEMPLATES[pkg[0]];
      const slow = !!p.slowLastWeeks && w >= weeks - p.slowLastWeeks;
      const perWeek = 3;
      for (let k = 0; k < perWeek; k++) {
        const [role, title, items] = tpl[(w * 3 + k) % tpl.length];
        push({ title: title(pkg[1]), who: who(role), dept: DEPT[role], due: addDays(ws, 1 + k * 2), projectId: p.id, seed: w * 7 + k * 3 + pi, items, lateBoost: slow });
      }
      push({ title: `Báo cáo tuần ${w + 1} gửi Chủ đầu tư (${p.code})`, who: p.roles.mgr, dept: DEPT.mgr, due: addDays(ws, 4), projectId: p.id, seed: w * 5 + pi + 1, important: true });
    }
    // Việc hàng tháng của dự án
    for (let m = addMonths(d(p.start).slice(0, 8) + "01", 1), k = 1; m <= today; m = addMonths(m, 1), k++) {
      const label = `${m.slice(5, 7)}/${m.slice(0, 4)}`;
      const day = (dd: number) => m.slice(0, 8) + String(dd).padStart(2, "0");
      push({ title: `Kế hoạch vật tư tháng ${label} (${p.code})`, who: "u3", dept: DEPT.mat, due: day(5), projectId: p.id, seed: k * 11 + pi, createdBy: "u1" });
      push({ title: `Huấn luyện an toàn định kỳ tháng ${label} (${p.code})`, who: who("hse"), dept: DEPT.hse, due: day(10), projectId: p.id, seed: k * 13 + pi, items: ["Lập danh sách", "Huấn luyện", "Ký sổ"] });
      push({ title: `Giao ban tháng ${label} với Chủ đầu tư (${p.code})`, who: who("dir"), dept: DEPT.dir, due: day(15), projectId: p.id, seed: k * 17 + pi, createdBy: "u1", important: true });
      push({ title: `Hồ sơ thanh toán đợt ${k} (${p.code})`, who: who("qs"), dept: DEPT.qs, due: day(25), projectId: p.id, seed: k * 19 + pi, items: ["Tổng hợp khối lượng", "Đối chiếu TVGS", "Trình ký", "Nộp Chủ đầu tư"], important: true });
    }
  });

  // Khối văn phòng và chỉ đạo của Ban TGĐ
  for (let m = addMonths(d(-321).slice(0, 8) + "01", 0), k = 1; m <= today; m = addMonths(m, 1), k++) {
    const label = `${m.slice(5, 7)}/${m.slice(0, 4)}`;
    const day = (dd: number) => m.slice(0, 8) + String(dd).padStart(2, "0");
    push({ title: `Giao ban Ban TGĐ tháng ${label}: duyệt kế hoạch sản xuất`, who: "u1", dept: "Ban Tổng Giám đốc", due: day(3), projectId: null, seed: k * 23, createdBy: "u1", important: true });
    push({ title: `Chỉ đạo: rà soát tiến độ, dòng tiền các dự án tháng ${label}`, who: k % 2 ? "u11" : "u3", dept: k % 2 ? DEPT.dir : DEPT.mat, due: day(12), projectId: null, seed: k * 29, createdBy: "u1", directive: true, important: true });
    if (k % 3 === 1 && k > 1) push({ title: `Báo cáo quý ${(k - 1) / 3} trình Hội đồng quản trị`, who: "u1", dept: "Ban Tổng Giám đốc", due: day(20), projectId: null, seed: k * 31, createdBy: "u1", important: true });
  }
  return out;
}
