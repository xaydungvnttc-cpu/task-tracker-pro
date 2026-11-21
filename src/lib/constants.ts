import type { RecurrenceFreq, Role, Scope, TaskStatus, TimeType } from "./types";

export const APP_NAME = "Task Tracker Pro";

/** Bản Demo đóng gói thành trang tĩnh (không có máy chủ API): ẩn các nút cần server */
export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

export const DEPARTMENTS = [
  "Ban Chỉ huy công trường",
  "Kỹ thuật thi công",
  "Kế hoạch - Vật tư",
  "Hợp đồng - Thanh toán (QS)",
  "An toàn - Chất lượng (HSE, QA/QC)",
];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Quản trị",
  manager: "Quản lý",
  editor: "Điều phối",
  member: "Thành viên",
};

export const ROLE_DESC: Record<Role, string> = {
  owner: "Toàn quyền, quản lý thành viên và tích hợp",
  manager: "Giao việc, xóa việc, xem báo cáo tổng",
  editor: "Tạo việc, sửa việc mình tạo hoặc được giao",
  member: "Cập nhật tiến độ, các bước, bàn giao việc được giao",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "on_hold", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Chưa làm",
  in_progress: "Đang làm",
  on_hold: "Tạm dừng",
  done: "Hoàn thành",
};

/** Lớp màu dùng chung cho mọi nơi hiển thị trạng thái */
export const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  on_hold: "bg-amber-500",
  done: "bg-emerald-500",
};

export const TIME_TYPE_LABEL: Record<TimeType, string> = {
  single: "1 ngày",
  multi: "Nhiều ngày",
  none: "Không giới hạn",
};

export const FREQ_LABEL: Record<RecurrenceFreq, string> = {
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  quarterly: "Hàng quý",
};

export const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const SCOPE_LABEL: Record<Scope, string> = {
  all: "Tất cả",
  mine: "Việc của tôi",
  team: "Đội nhóm",
  unassigned: "Chưa gán",
};

export const QUADRANTS = [
  { id: "q1", title: "Làm ngay", hint: "Quan trọng + Khẩn cấp", important: true, urgent: true, tone: "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30" },
  { id: "q2", title: "Lên lịch", hint: "Quan trọng + Không khẩn cấp", important: true, urgent: false, tone: "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30" },
  { id: "q3", title: "Giao việc / Ủy quyền", hint: "Không quan trọng + Khẩn cấp", important: false, urgent: true, tone: "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30" },
  { id: "q4", title: "Loại bỏ / Hoãn", hint: "Không quan trọng + Không khẩn cấp", important: false, urgent: false, tone: "border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40" },
] as const;

export const AVATAR_COLORS = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5"];
