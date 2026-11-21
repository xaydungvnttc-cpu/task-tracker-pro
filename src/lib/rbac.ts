import type { Task, User } from "./types";

/**
 * Một chỗ duy nhất quyết định ai được làm gì. Giao diện dùng hàm này để ẩn/khóa nút;
 * firestore.rules áp lại đúng các quy tắc này ở phía máy chủ.
 *
 * Ví dụ: Member được giao "Nghiệm thu cốt thép" thì được đổi trạng thái, tick checklist,
 * dán link biên bản bàn giao, nhưng không được sửa hạn chót hay đổi người thực hiện.
 */
export const can = {
  createTask: (u: User) => u.role !== "member",
  assignOthers: (u: User) => u.role === "owner" || u.role === "manager",
  deleteTask: (u: User) => u.role === "owner" || u.role === "manager",
  /** Sửa toàn bộ trường của task */
  editTask: (u: User, t: Task) =>
    u.role === "owner" || u.role === "manager" || (u.role === "editor" && (t.createdBy === u.id || t.assigneeId === u.id)),
  /** Cập nhật tiến độ: trạng thái, checklist, link bàn giao */
  updateProgress: (u: User, t: Task) => can.editTask(u, t) || t.assigneeId === u.id,
  comment: (_u: User) => true,
  manageMembers: (u: User) => u.role === "owner",
  manageIntegrations: (u: User) => u.role === "owner",
  viewReports: (u: User) => u.role === "owner" || u.role === "manager",
  /** Tạo, sửa dự án và mốc tiến độ */
  manageProjects: (u: User) => u.role === "owner" || u.role === "manager",
};
