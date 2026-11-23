import type { Project, Task, User } from "./types";

/** Giám đốc dự án hoặc Chỉ huy trưởng của dự án: được điều hành mọi việc trong dự án mình phụ trách */
export const leadsProject = (u: User, p?: Project | null) => !!p && (p.directorId === u.id || p.siteManagerId === u.id);

/**
 * Một chỗ duy nhất quyết định ai được làm gì. Giao diện dùng hàm này để ẩn/khóa nút;
 * firestore.rules áp lại đúng các quy tắc này ở phía máy chủ.
 *
 * Ví dụ: Member được giao "Nghiệm thu cốt thép" thì được đổi trạng thái, tick checklist,
 * dán link biên bản bàn giao, nhưng không được sửa hạn chót hay đổi người thực hiện.
 *
 * Phân cấp công ty đến dự án:
 * - Quản trị (Chủ tịch, TGĐ): toàn quyền, duyệt tài khoản mới, cài đặt tích hợp.
 * - Quản lý (Phó TGĐ, trưởng phòng): giao, sửa, xóa mọi việc; tạo và sửa mọi dự án.
 * - GĐDA, Chỉ huy trưởng (theo từng dự án, dù vai trò là Điều phối): giao và sửa mọi việc của dự án mình,
 *   sửa mốc tiến độ, thành viên dự án; không đổi được GĐDA, CHT, không xóa dự án.
 * - Điều phối: tạo việc, sửa việc mình tạo hoặc được giao.
 * - Thành viên: cập nhật tiến độ việc được giao, bình luận.
 * - Tài khoản mới đăng nhập lần đầu: chờ Quản trị duyệt, chưa xem được dữ liệu.
 */
export const can = {
  createTask: (u: User) => u.role !== "member",
  /** Giao việc cho người khác: Quản trị, Quản lý; GĐDA và CHT giao trong dự án mình */
  assignOthers: (u: User, p?: Project | null) => u.role === "owner" || u.role === "manager" || leadsProject(u, p),
  deleteTask: (u: User) => u.role === "owner" || u.role === "manager",
  /** Sửa toàn bộ trường của task */
  editTask: (u: User, t: Task, p?: Project | null) =>
    u.role === "owner" || u.role === "manager" || leadsProject(u, p) || (u.role === "editor" && (t.createdBy === u.id || t.assigneeId === u.id)),
  /** Cập nhật tiến độ: trạng thái, checklist, link bàn giao */
  updateProgress: (u: User, t: Task, p?: Project | null) => can.editTask(u, t, p) || t.assigneeId === u.id,
  comment: (_u: User) => true,
  manageMembers: (u: User) => u.role === "owner",
  manageIntegrations: (u: User) => u.role === "owner",
  viewReports: (u: User) => u.role === "owner" || u.role === "manager",
  /** Tạo, xóa dự án, đổi GĐDA và CHT */
  manageProjects: (u: User) => u.role === "owner" || u.role === "manager",
  /** Sửa thông tin, mốc tiến độ, thành viên của một dự án */
  editProject: (u: User, p: Project) => can.manageProjects(u) || leadsProject(u, p),
};
