import { diffDays } from "./dates";
import { daysLeft } from "./tasks";
import type { Task, User } from "./types";

/**
 * Quy tắc nhắc việc dùng chung cho app (mục "Cần chú ý") và lịch nhắc tự động (Zalo, chuông).
 * Ví dụ với việc hạn 25/11, hôm nay 22/11: còn 3 ngày → nhắc người làm.
 * Nếu 27/11 vẫn chưa xong (trễ 2 ngày) → báo quản lý phòng; 30/11 (trễ 5 ngày) → báo Ban TGĐ.
 */
export const RULES = {
  remindBefore: [3, 1, 0], // nhắc người làm khi còn 3 ngày, 1 ngày và đúng ngày hạn
  escalateManager: 2, // trễ từ 2 ngày: báo quản lý phòng ban
  escalateOwner: 5, // trễ từ 5 ngày: báo Ban Tổng Giám đốc
  unassignedDays: 1, // tạo quá 1 ngày mà chưa giao người
  staleDays: 7, // đang làm mà 7 ngày không ai cập nhật
};

const open = (tasks: Task[]) => tasks.filter((t) => t.status !== "done");
const lateDays = (t: Task, today: string) => -(daysLeft(t, today) ?? 0);

/** Các nhóm việc dễ bị sót, sắp xếp việc nặng nhất lên đầu */
export function watchList(tasks: Task[], today: string) {
  const o = open(tasks);
  const byLate = (a: Task, b: Task) => lateDays(b, today) - lateDays(a, today);
  const late = (n: number) => o.filter((t) => t.dueDate && lateDays(t, today) >= n).sort(byLate);
  const owner = late(RULES.escalateOwner);
  return {
    escalateOwner: owner,
    escalateManager: late(RULES.escalateManager).filter((t) => !owner.includes(t)),
    unassigned: o.filter((t) => !t.assigneeId && diffDays(today, t.createdAt.slice(0, 10)) >= RULES.unassignedDays),
    stale: o.filter((t) => t.status === "in_progress" && diffDays(today, t.updatedAt.slice(0, 10)) >= RULES.staleDays),
  };
}

/** Lời nhắc riêng cho người làm, ví dụ "Còn 1 ngày: Nghiệm thu cốt thép sàn tầng 6" */
export function personalReminder(t: Task, today: string): string | null {
  const d = daysLeft(t, today);
  if (t.status === "done" || d === null) return null;
  if (d < 0) return `Quá hạn ${-d} ngày`;
  if (d === 0) return "Hôm nay là hạn";
  return RULES.remindBefore.includes(d) ? `Còn ${d} ngày` : null;
}

/** Người nhận leo thang: quản lý cùng phòng ban (không có thì Owner) */
export function managersOf(t: Task, users: User[]): User[] {
  const m = users.filter((u) => u.role === "manager" && u.department === t.department);
  return m.length ? m : users.filter((u) => u.role === "owner");
}
