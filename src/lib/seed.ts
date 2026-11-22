import { addDays, addMonths, startOfWeek } from "./dates";
import { buildHistory } from "./seed-history";
import type { AppNotification, Project, Task, User } from "./types";

export const SEED_USERS: User[] = [
  { id: "u1", name: "Nguyễn Văn An", email: "an@demo.vn", role: "owner", department: "Ban Tổng Giám đốc", title: "Tổng Giám đốc", color: "#2563eb" },
  { id: "u2", name: "Trần Thị Bình", email: "binh@demo.vn", role: "manager", department: "Kỹ thuật thi công", title: "Chỉ huy trưởng công trường", color: "#db2777" },
  { id: "u3", name: "Lê Hoàng Cường", email: "cuong@demo.vn", role: "manager", department: "Kế hoạch - Vật tư", title: "Trưởng ban Kế hoạch - Vật tư", color: "#059669" },
  { id: "u4", name: "Phạm Minh Dũng", email: "dung@demo.vn", role: "editor", department: "Kỹ thuật thi công", title: "Kỹ sư giám sát", color: "#d97706" },
  { id: "u5", name: "Võ Thị Hà", email: "ha@demo.vn", role: "member", department: "Hợp đồng - Thanh toán (QS)", title: "Kỹ sư QS (khối lượng, thanh toán)", color: "#7c3aed" },
  { id: "u6", name: "Đỗ Quang Huy", email: "huy@demo.vn", role: "member", department: "Kế hoạch - Vật tư", title: "Thủ kho, cán bộ vật tư", color: "#0891b2" },
  { id: "u7", name: "Hoàng Thu Lan", email: "lan@demo.vn", role: "member", department: "An toàn - Chất lượng (HSE, QA/QC)", title: "Kỹ sư QA/QC", color: "#dc2626" },
  { id: "u8", name: "Bùi Đức Long", email: "long@demo.vn", role: "editor", department: "Kỹ thuật thi công", title: "Kỹ sư MEP (điện nước)", color: "#4f46e5" },
  { id: "u9", name: "Ngô Thị Mai", email: "mai@demo.vn", role: "member", department: "An toàn - Chất lượng (HSE, QA/QC)", title: "Cán bộ an toàn HSE", color: "#0d9488" },
  { id: "u10", name: "Trịnh Văn Nam", email: "nam@demo.vn", role: "member", department: "Kỹ thuật thi công", title: "Kỹ sư trắc đạc", color: "#ea580c" },
  { id: "u11", name: "Phan Quốc Khánh", email: "khanh@demo.vn", role: "manager", department: "Ban Chỉ huy công trường", title: "Giám đốc dự án Phố Nối, Ngọc Thụy", color: "#9333ea" },
  { id: "u12", name: "Lý Thanh Tâm", email: "tam@demo.vn", role: "editor", department: "Ban Chỉ huy công trường", title: "Chỉ huy trưởng Nhà xưởng Phố Nối", color: "#be123c" },
  { id: "u13", name: "Đặng Minh Tuấn", email: "tuan@demo.vn", role: "editor", department: "Ban Chỉ huy công trường", title: "Chỉ huy trưởng Trường Ngọc Thụy", color: "#15803d" },
  { id: "u14", name: "Nguyễn Hữu Phúc", email: "phuc@demo.vn", role: "editor", department: "Kỹ thuật thi công", title: "Kỹ sư giám sát Phố Nối", color: "#0369a1" },
  { id: "u15", name: "Trần Văn Quang", email: "quang@demo.vn", role: "member", department: "Kỹ thuật thi công", title: "Kỹ sư kết cấu thép Phố Nối", color: "#a16207" },
  { id: "u16", name: "Lê Thị Thu", email: "thu@demo.vn", role: "editor", department: "Kỹ thuật thi công", title: "Kỹ sư giám sát Ngọc Thụy", color: "#c026d3" },
  { id: "u17", name: "Vũ Đình Sơn", email: "son@demo.vn", role: "member", department: "Kỹ thuật thi công", title: "Kỹ sư trắc đạc Ngọc Thụy", color: "#4d7c0f" },
];


/** Dữ liệu mẫu tính theo ngày hôm nay, để mở app lúc nào cũng thấy đủ quá hạn, sắp hạn, đã xong */
export function buildSeed(today: string): { users: User[]; projects: Project[]; tasks: Task[]; notifications: AppNotification[] } {
  const d = (n: number) => addDays(today, n);
  const ms = (id: string, name: string, planned: number, actual: number | null) => ({ id, name, plannedDate: d(planned), actualDate: actual === null ? null : d(actual) });

  // 3 dự án mẫu: Sông Hồng chậm nhẹ (vàng), Phố Nối chậm lắp dựng thép (đỏ), Ngọc Thụy đúng tiến độ (xanh)
  const projects: Project[] = [
    {
      id: "p1", code: "SH", name: "Chung cư Sông Hồng Residence", client: "Công ty CP Đầu tư Sông Hồng", directorId: "u2", siteManagerId: "u4", memberIds: ["u3", "u5", "u6", "u7", "u8", "u9", "u10"],
      startDate: d(-321), endDate: d(240), status: "active", color: "#2563eb",
      milestones: [ms("m0", "Xong cọc thử, thí nghiệm nén tĩnh", -280, -282), ms("m01", "Xong cọc đại trà", -220, -221), ms("m1", "Xong phần móng, tầng hầm", -150, -152), ms("m2", "Xong phần thô tầng 1-4", -30, -27), ms("m3", "Xong phần thô tầng 5", -3, null), ms("m4", "Cất nóc khối A", 60, null), ms("m5", "Bàn giao", 240, null)],
    },
    {
      id: "p2", code: "PN", name: "Nhà xưởng KCN Phố Nối B", client: "Công ty TNHH Cơ khí Hưng Yên", directorId: "u11", siteManagerId: "u12", memberIds: ["u3", "u5", "u6", "u7", "u9", "u14", "u15"],
      startDate: d(-290), endDate: d(80), status: "active", color: "#dc2626",
      milestones: [ms("m0", "San nền, bàn giao mặt bằng", -250, -251), ms("m1", "Xong móng cột, nền xưởng", -120, -117), ms("m15", "Gia công xong kết cấu thép tại xưởng", -60, -55), ms("m2", "Lắp dựng xong kết cấu thép", -10, null), ms("m3", "Lợp mái, bao che", 25, null), ms("m4", "Bàn giao", 80, null)],
    },
    {
      id: "p3", code: "NT", name: "Trường THCS Ngọc Thụy", client: "Ban QLDA quận Long Biên", directorId: "u11", siteManagerId: "u13", memberIds: ["u3", "u5", "u6", "u7", "u9", "u16", "u17"],
      startDate: d(-260), endDate: d(330), status: "active", color: "#059669",
      milestones: [ms("m0", "Xin phép xây dựng, rào chắn công trường", -220, -222), ms("m01", "Giải phóng mặt bằng khu nhà học", -120, -121), ms("m02", "Xong cọc thử, thí nghiệm nén tĩnh", -40, -41), ms("m1", "Xong cọc khoan nhồi", 6, null), ms("m2", "Xong móng, giằng móng", 45, null), ms("m3", "Cất nóc", 200, null), ms("m4", "Bàn giao trước năm học mới", 330, null)],
    },
  ];
  const at = (n: number, h = 16) => `${d(n)}T${String(h).padStart(2, "0")}:00:00.000Z`;
  const nextMon = addDays(startOfWeek(today), 7);
  const lastMon = addDays(startOfWeek(today), -7);
  const friday = addDays(startOfWeek(today), 4);
  let seq = 0;
  const ck = (items: [string, boolean][]) => items.map(([text, done]) => ({ id: `c${++seq}`, text, done }));

  const base = (p: Partial<Task> & Pick<Task, "id" | "title">): Task => ({
    description: "",
    assigneeId: null,
    watcherIds: [],
    department: "Kỹ thuật thi công",
    important: false,
    urgent: false,
    timeType: "single",
    startDate: null,
    dueDate: null,
    status: "todo",
    checklist: [],
    inputLinks: [],
    outputLinks: [],
    requireOutput: true,
    recurrence: null,
    recurrenceSpawned: false,
    comments: [],
    completedAt: null,
    createdBy: "u1",
    projectId: "p1",
    directive: false,
    createdAt: at(-14, 2),
    updatedAt: at(-1, 2),
    ...p,
  });

  const tasks: Task[] = [
    base({
      id: "t1", title: "Nghiệm thu cốt thép sàn tầng 5 khối A", assigneeId: "u4", watcherIds: ["u2"], important: true, urgent: true,
      dueDate: today, status: "in_progress", requireOutput: true, createdBy: "u2",
      description: "Phối hợp TVGS nghiệm thu trước khi đổ bê tông sàn ngày mai.",
      checklist: ck([["Tự kiểm tra nội bộ", true], ["Mời TVGS", true], ["Ký biên bản nghiệm thu", false]]),
      inputLinks: [{ label: "Bản vẽ KC sàn T5", url: "https://drive.google.com/" }],
      comments: [{ id: "cm1", userId: "u2", text: "@Phạm Minh Dũng nhớ chụp ảnh con kê trước khi mời TVGS nhé.", createdAt: at(0, 1) }],
    }),
    base({
      id: "t2", title: "Lập hồ sơ thanh toán đợt 3 gửi Chủ đầu tư", assigneeId: "u5", watcherIds: ["u1", "u3"], department: "Hợp đồng - Thanh toán (QS)",
      important: true, urgent: true, timeType: "multi", startDate: d(-5), dueDate: d(-1), status: "in_progress", requireOutput: true,
      checklist: ck([["Tổng hợp khối lượng", true], ["Đối chiếu với TVGS", true], ["Lập bảng giá trị", false], ["Trình ký Giám đốc", false]]),
      inputLinks: [{ label: "Bảng khối lượng đợt 3", url: "https://docs.google.com/spreadsheets/" }],
    }),
    base({ id: "t3", title: "Đặt hàng thép D16-D25 cho sàn tầng 6", assigneeId: "u6", watcherIds: ["u3"], department: "Kế hoạch - Vật tư", important: true, urgent: true, dueDate: d(1), createdBy: "u3" }),
    base({
      id: "t4", title: "Lập kế hoạch thi công 3 tuần tới", assigneeId: "u2", department: "Kỹ thuật thi công", important: true,
      timeType: "multi", startDate: d(-2), dueDate: d(4), status: "in_progress",
      checklist: ck([["Rà tiến độ tổng", true], ["Cân đối nhân lực", false], ["Chốt nhu cầu vật tư", false]]),
    }),
    base({
      id: "t5", title: "Báo cáo tuần gửi Chủ đầu tư", assigneeId: "u3", watcherIds: ["u1"], department: "Kế hoạch - Vật tư", important: true, urgent: true,
      dueDate: friday >= today ? friday : addDays(friday, 7), recurrence: { freq: "weekly", weekdays: [5] }, requireOutput: true,
    }),
    base({
      id: "t6", title: "Kiểm tra an toàn giàn giáo đầu ca", assigneeId: "u4", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, urgent: true, dueDate: today,
      recurrence: { freq: "daily" }, checklist: ck([["Neo giằng", false], ["Lan can, lưới", false], ["Biển cảnh báo", false]]),
    }),
    base({ id: "t7", title: "Đối chiếu khối lượng, công nợ nhà cung cấp bê tông", assigneeId: "u5", department: "Hợp đồng - Thanh toán (QS)", important: true, dueDate: d(6), recurrence: { freq: "monthly" } }),
    base({ id: "t8", title: "Lập hồ sơ quản lý chất lượng hạng mục MEP", assigneeId: "u7", watcherIds: ["u2"], department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, timeType: "multi", startDate: d(-10), dueDate: d(20), status: "in_progress" }),
    base({ id: "t9", title: "Gia hạn bảo hiểm mọi rủi ro công trình", department: "Hợp đồng - Thanh toán (QS)", important: true, urgent: true, dueDate: d(2) }),
    base({
      id: "t10", title: "Chuẩn bị hồ sơ dự thầu gói hạ tầng kỹ thuật", projectId: null, assigneeId: "u3", watcherIds: ["u1"], department: "Kế hoạch - Vật tư", important: true,
      timeType: "multi", startDate: d(-3), dueDate: d(10), status: "in_progress",
      checklist: ck([["Mua HSMT", true], ["Khảo sát hiện trường", true], ["Lập biện pháp thi công", false], ["Lập dự toán dự thầu", false], ["Bảo lãnh dự thầu", false]]),
    }),
    base({
      id: "t11", title: "Sửa máy bơm bê tông số 2", assigneeId: "u6", department: "Kế hoạch - Vật tư", urgent: true, dueDate: d(-2), status: "on_hold",
      comments: [{ id: "cm2", userId: "u6", text: "Đang chờ phụ tùng từ nhà cung cấp, dự kiến 3 ngày.", createdAt: at(-1, 3) }],
    }),
    base({ id: "t12", projectId: null, title: "Họp giao ban đầu tuần", assigneeId: "u1", department: "Ban Chỉ huy công trường", important: true, dueDate: lastMon, status: "done", completedAt: `${lastMon}T03:00:00.000Z`, recurrence: { freq: "weekly", weekdays: [1] }, recurrenceSpawned: true }),
    base({ id: "t13", projectId: null, title: "Họp giao ban đầu tuần", assigneeId: "u1", department: "Ban Chỉ huy công trường", important: true, dueDate: nextMon, recurrence: { freq: "weekly", weekdays: [1] } }),
    base({ id: "t14", title: "Cập nhật bản vẽ hoàn công tầng 3", assigneeId: "u4", timeType: "none", createdBy: "u4" }),
    base({ id: "t15", title: "Dọn dẹp, sắp xếp kho vật tư tạm", department: "Kế hoạch - Vật tư", dueDate: d(12) }),
    base({ id: "t16", title: "Báo cáo an toàn lao động tháng gửi Chủ đầu tư", assigneeId: "u7", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, dueDate: d(-2), status: "done", completedAt: at(-3), recurrence: { freq: "monthly" }, recurrenceSpawned: true }),
    base({ id: "t17", title: "Báo cáo an toàn lao động tháng gửi Chủ đầu tư", assigneeId: "u7", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, dueDate: addMonths(d(-2), 1), recurrence: { freq: "monthly" } }),
    base({
      id: "t18", title: "Nghiệm thu chống thấm sàn mái khối B", assigneeId: "u2", important: true, urgent: true, dueDate: d(-1), status: "done", completedAt: at(-1, 9),
      requireOutput: true, outputLinks: [{ label: "Biên bản nghiệm thu chống thấm", url: "https://drive.google.com/" }],
    }),
    base({ id: "t19", title: "Trình duyệt mẫu gạch ốp lát", assigneeId: "u3", department: "Kế hoạch - Vật tư", important: true, dueDate: d(-8), status: "done", completedAt: at(-6) }),
    base({ id: "t20", title: "Lắp dựng cốp pha cột tầng 6", assigneeId: "u4", important: true, timeType: "multi", startDate: d(-4), dueDate: d(-1), status: "done", completedAt: at(-2) }),
    base({ id: "t21", title: "Nhập kho xi măng 200 tấn", assigneeId: "u6", department: "Kế hoạch - Vật tư", urgent: true, dueDate: today, status: "done", completedAt: at(0, 2) }),
    base({ id: "t22", title: "Kiểm kê thiết bị thi công cuối quý", assigneeId: "u6", watcherIds: ["u3"], department: "Kế hoạch - Vật tư", important: true, timeType: "multi", startDate: d(3), dueDate: d(9), status: "on_hold", recurrence: { freq: "quarterly" } }),
    // Lịch sử đã hoàn thành (để Dashboard, bảng xếp hạng, tỷ lệ đúng hạn có số liệu thật)
    base({ id: "t23", title: "Đổ bê tông sàn tầng 4 khối A (B30, 186 m³)", assigneeId: "u2", watcherIds: ["u1"], important: true, urgent: true, timeType: "multi", startDate: d(-24), dueDate: d(-22), status: "done", completedAt: at(-22, 12), createdAt: at(-40), requireOutput: true, outputLinks: [{ label: "Phiếu giao nhận bê tông + nhật ký đổ", url: "https://drive.google.com/" }] }),
    base({ id: "t24", title: "Nghiệm thu cốt thép sàn tầng 4 khối A", assigneeId: "u4", important: true, urgent: true, dueDate: d(-25), status: "done", completedAt: at(-25, 9), createdAt: at(-35), outputLinks: [{ label: "Biên bản nghiệm thu (scan)", url: "https://drive.google.com/" }] }),
    base({ id: "t25", title: "Hồ sơ thanh toán đợt 2 gửi Chủ đầu tư", assigneeId: "u5", watcherIds: ["u1"], department: "Hợp đồng - Thanh toán (QS)", important: true, urgent: true, timeType: "multi", startDate: d(-34), dueDate: d(-28), status: "done", completedAt: at(-29), createdAt: at(-40) }),
    base({ id: "t26", title: "Báo cáo an toàn lao động tháng trước", assigneeId: "u9", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, dueDate: d(-21), status: "done", completedAt: at(-20), createdAt: at(-30) }),
    base({ id: "t27", title: "Lắp đặt ống chờ điện nước sàn tầng 4", assigneeId: "u8", important: true, urgent: true, timeType: "multi", startDate: d(-26), dueDate: d(-23), status: "done", completedAt: at(-23, 10), createdAt: at(-35) }),
    base({ id: "t28", title: "Định vị tim trục, cao độ tầng 5", assigneeId: "u10", important: true, urgent: true, dueDate: d(-10), status: "done", completedAt: at(-9), createdAt: at(-20) }),
    base({ id: "t29", title: "Thí nghiệm nén mẫu bê tông 28 ngày sàn tầng 3", assigneeId: "u7", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, dueDate: d(-12), status: "done", completedAt: at(-12, 8), createdAt: at(-30), outputLinks: [{ label: "Kết quả thí nghiệm LAS-XD", url: "https://drive.google.com/" }] }),
    base({ id: "t30", title: "Huấn luyện an toàn cho tổ đội cốp pha mới vào", assigneeId: "u9", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, urgent: true, dueDate: d(-14), status: "done", completedAt: at(-15), createdAt: at(-20) }),
    base({ id: "t31", title: "Nhập kho thép đợt 5 (120 tấn)", assigneeId: "u6", department: "Kế hoạch - Vật tư", urgent: true, dueDate: d(-18), status: "done", completedAt: at(-18, 6), createdAt: at(-25) }),
    base({ id: "t32", title: "Trình duyệt biện pháp giàn giáo bao che", assigneeId: "u2", important: true, dueDate: d(-33), status: "done", completedAt: at(-35), createdAt: at(-45) }),
    base({ id: "t33", title: "Hồ sơ thanh toán thầu phụ điện nước đợt 1", assigneeId: "u5", department: "Hợp đồng - Thanh toán (QS)", important: true, dueDate: d(-12), status: "done", completedAt: at(-10), createdAt: at(-20) }),
    base({ id: "t34", title: "Kiểm tra chứng chỉ chất lượng thép đầu vào lô 5", assigneeId: "u7", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, urgent: true, dueDate: d(-17), status: "done", completedAt: at(-17), createdAt: at(-20) }),
    // Đang làm và sắp tới
    base({
      id: "t35", title: "Lắp đặt ống chờ điện nước sàn tầng 5", assigneeId: "u8", watcherIds: ["u2"], important: true, urgent: true, timeType: "multi", startDate: d(-1), dueDate: d(1), status: "in_progress",
      checklist: ck([["Ống luồn dây điện", true], ["Hộp đấu nối", false], ["Ống cấp thoát nước xuyên sàn", false], ["Chụp ảnh nghiệm thu nội bộ", false]]),
      inputLinks: [{ label: "Bản vẽ shop MEP tầng 5 (rev.2)", url: "https://drive.google.com/" }],
    }),
    base({ id: "t36", title: "Kiểm tra độ thẳng đứng cột tầng 5", assigneeId: "u10", important: true, dueDate: d(2) }),
    base({ id: "t37", title: "Ép mẫu bê tông 7 ngày sàn tầng 4", assigneeId: "u7", department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, urgent: true, dueDate: today, requireOutput: true }),
    base({ id: "t38", title: "Kiểm tra điện tạm, tủ điện công trường", assigneeId: "u9", department: "An toàn - Chất lượng (HSE, QA/QC)", urgent: true, dueDate: addDays(startOfWeek(today), 9), recurrence: { freq: "weekly", weekdays: [3] }, checklist: ck([["Tủ điện có khóa, biển báo", false], ["CB chống giật", false], ["Dây dẫn không trầy, ngập nước", false]]) }),
    base({ id: "t39", title: "Kế hoạch tiếp nhận vật tư tháng sau", assigneeId: "u3", department: "Kế hoạch - Vật tư", important: true, dueDate: d(8) }),
    base({
      id: "t40", title: "Đổ bê tông sàn tầng 5 khối A", assigneeId: "u2", watcherIds: ["u1", "u4", "u7"], important: true, urgent: true, timeType: "multi", startDate: d(2), dueDate: d(3), requireOutput: true,
      checklist: ck([["Đặt bê tông thương phẩm 190 m³", false], ["Bố trí 2 xe bơm, máy đầm", false], ["Lấy mẫu thí nghiệm", false], ["Dưỡng hộ 7 ngày", false]]),
    }),
    base({ id: "t41", title: "Họp với Tư vấn giám sát về bản vẽ shop MEP", assigneeId: "u8", watcherIds: ["u2"], important: true, dueDate: d(5) }),
    base({
      id: "t42", title: "Xử lý vết nứt chân cột C5 tầng 2 (phiếu NCR-012)", assigneeId: "u7", watcherIds: ["u1", "u2"], department: "An toàn - Chất lượng (HSE, QA/QC)", important: true, urgent: true, dueDate: d(-3), status: "in_progress",
      checklist: ck([["Khoanh vùng, chụp ảnh hiện trạng", true], ["Đề xuất biện pháp sửa chữa", true], ["TVGS chấp thuận", false], ["Thi công sửa chữa", false]]),
      comments: [{ id: "cm3", userId: "u1", text: "@Hoàng Thu Lan ưu tiên xong trước khi đổ sàn tầng 5, báo lại anh trong chiều nay.", createdAt: at(-1, 8) }],
    }),
    base({ id: "t44", title: "Lắp dựng cốp pha dầm sàn tầng 5", assigneeId: "u4", important: true, urgent: true, timeType: "multi", startDate: d(-3), dueDate: d(1), status: "in_progress", checklist: ck([["Cột chống", true], ["Ván đáy dầm", true], ["Ván sàn", false], ["Kiểm tra cao độ", false]]) }),
    base({ id: "t45", title: "Rà soát phát sinh thép do thay đổi thiết kế dầm D3", assigneeId: "u5", department: "Hợp đồng - Thanh toán (QS)", important: true, dueDate: d(12) }),
    base({ id: "t46", title: "Hồ sơ thanh toán đợt 4", assigneeId: "u5", department: "Hợp đồng - Thanh toán (QS)", important: true, timeType: "multi", startDate: d(28), dueDate: d(35) }),
    base({ id: "t47", title: "Nghiệm thu hoàn thành phần thô tầng 1 đến 5", assigneeId: "u2", watcherIds: ["u1"], important: true, dueDate: d(40) }),
  ];

  // Bộ việc bổ sung (t48 trở đi) cho đủ khoảng 100 đầu việc, phủ đủ các mảng của Ban chỉ huy
  // Cột: tiêu đề, người làm, phòng ban (chỉ số DEPTS), ngày bắt đầu, hạn chót (số ngày so với hôm nay), trạng thái,
  // cờ (Q = quan trọng, G = gấp, C = chỉ đạo của Ban TGĐ), checklist, dự án ("" = khối văn phòng, mặc định p1)
  type Row = [string, string | null, number, number | null, number | null, Task["status"], string, string[]?, string?];
  const DEPTS = ["Ban Chỉ huy công trường", "Kỹ thuật thi công", "Kế hoạch - Vật tư", "Hợp đồng - Thanh toán (QS)", "An toàn - Chất lượng (HSE, QA/QC)", "Ban Tổng Giám đốc"];
  const rows: Row[] = [
    // Đã hoàn thành (lịch sử)
    ["Bàn giao mặt bằng thi công khối B cho tổ đội", "u2", 1, null, -44, "done", "QG"],
    ["Ký hợp đồng thầu phụ cốp pha nhôm", "u1", 0, -50, -40, "done", "Q"],
    ["Phê duyệt tiến độ tổng thể điều chỉnh lần 1", "u1", 0, null, -38, "done", "Q"],
    ["Đổ bê tông cột vách tầng 4 khối A", "u4", 1, -30, -29, "done", "QG"],
    ["Tháo dỡ cốp pha sàn tầng 3 khối A", "u4", 1, -27, -25, "done", "G"],
    ["Nghiệm thu điện nước âm sàn tầng 4", "u8", 1, null, -24, "done", "QG"],
    ["Lập biên bản xác nhận khối lượng phát sinh cọc khoan nhồi", "u5", 3, null, -36, "done", "Q"],
    ["Hoàn công móng khối B", "u10", 1, -32, -27, "done", "Q"],
    ["Diễn tập phòng cháy chữa cháy công trường", "u9", 4, null, -19, "done", "Q"],
    ["Nhập kho gạch block 60.000 viên", "u6", 2, null, -16, "done", "G"],
    ["Kiểm định cẩu tháp TC-01 định kỳ", "u9", 4, null, -15, "done", "QG"],
    ["Quyết toán khối lượng thầu phụ ép cọc", "u5", 3, -30, -14, "done", "Q"],
    ["Nghiệm thu cốt thép cột vách tầng 5 khối A", "u4", 1, null, -11, "done", "QG"],
    ["Đổ bê tông cột vách tầng 5 khối A", "u2", 1, -10, -9, "done", "QG"],
    ["Đo lún, quan trắc công trình lân cận đợt 4", "u10", 1, null, -8, "done", "Q"],
    ["Chọn nhà cung cấp cửa nhôm kính", "u3", 2, -20, -7, "done", "Q"],
    ["Kiểm tra hồ sơ an toàn tổ đội xây tô", "u9", 4, null, -5, "done", ""],
    ["Nghiệm thu xây tường tầng 2 khối A", "u7", 4, null, -4, "done", "Q"],
    ["Cập nhật nhật ký thi công tuần trước", "u4", 1, null, -3, "done", ""],
    // Đang làm
    ["Xây tường bao che tầng 3 khối A", "u4", 1, -6, 6, "in_progress", "Q", ["Định vị tường", "Xây đến cao độ lanh tô", "Đổ lanh tô", "Xây hoàn thiện"]],
    ["Lắp đặt ống thoát nước đứng trục kỹ thuật khối A", "u8", 1, -4, 5, "in_progress", "Q"],
    ["Lập bản vẽ shop cầu thang bộ tầng 6 đến 10", "u4", 1, -2, 3, "in_progress", "QG"],
    ["Tổng hợp nhu cầu vật tư hoàn thiện đợt 1", "u3", 2, -3, 4, "in_progress", "Q"],
    ["Đối chiếu khối lượng thầu phụ xây tô tháng này", "u5", 3, -2, 2, "in_progress", "QG"],
    ["Lập dự toán phát sinh thay đổi vật liệu chống thấm", "u5", 3, -5, -1, "in_progress", "QG"],
    ["Kiểm tra mẫu vữa xây, vữa trát tại hiện trường", "u7", 4, -1, 1, "in_progress", "G"],
    ["Cập nhật kế hoạch an toàn khi thi công trên cao", "u9", 4, -3, 2, "in_progress", "Q"],
    ["Đo kiểm tra độ phẳng sàn tầng 4 khối A", "u10", 1, null, -2, "in_progress", "QG"],
    ["Rà soát hợp đồng cung cấp thang máy", "u1", 0, -4, 3, "in_progress", "Q"],
    ["Lập kế hoạch nhân lực tháng sau", "u2", 1, -1, 5, "in_progress", "Q"],
    ["Theo dõi thép tồn kho, đề xuất điều chuyển", "u6", 2, -2, 1, "in_progress", "G"],
    // Tạm dừng
    ["Lắp đặt vận thăng lồng khối B", "u6", 2, -3, 4, "on_hold", "QG"],
    ["Thi công hố ga thoát nước ngoài nhà", "u2", 1, 3, 15, "on_hold", ""],
    ["Đặt hàng thiết bị vệ sinh mẫu", "u3", 2, null, 9, "on_hold", ""],
    ["Điều chỉnh hợp đồng thầu phụ điện nước theo khối lượng mới", "u5", 3, null, 6, "on_hold", "Q"],
    // Sắp tới
    ["Nghiệm thu cốt thép cột vách tầng 6 khối A", "u4", 1, null, 4, "todo", "QG"],
    ["Đổ bê tông cột vách tầng 6 khối A", "u2", 1, 5, 6, "todo", "QG"],
    ["Lắp dựng cốp pha sàn tầng 6 khối A", "u4", 1, 6, 10, "todo", "Q"],
    ["Định vị tim trục, cao độ tầng 6", "u10", 1, null, 3, "todo", "QG"],
    ["Mời TVGS nghiệm thu chống thấm vệ sinh tầng 2", "u7", 4, null, 2, "todo", "QG"],
    ["Đặt bê tông thương phẩm cho sàn tầng 6", "u6", 2, null, 7, "todo", "G"],
    ["Lấy báo giá 3 nhà cung cấp sơn nước", "u3", 2, null, 11, "todo", ""],
    ["Lập hồ sơ đề nghị tạm ứng vật tư hoàn thiện", "u5", 3, null, 8, "todo", "Q"],
    ["Huấn luyện an toàn định kỳ quý cho toàn công trường", "u9", 4, null, 13, "todo", "Q"],
    ["Kiểm tra hệ thống chống sét tạm, nối đất cẩu tháp", "u9", 4, null, 5, "todo", "G"],
    ["Lập biện pháp thi công mặt dựng nhôm kính", "u2", 1, 4, 14, "todo", "Q"],
    ["Họp phối hợp thầu phụ MEP và kết cấu tầng 6", "u8", 1, null, 3, "todo", "Q"],
    ["Đo lún, quan trắc công trình lân cận đợt 5", "u10", 1, null, 9, "todo", "Q"],
    ["Rà soát hồ sơ chất lượng phần móng để nghiệm thu giai đoạn", "u7", 4, 2, 16, "todo", "Q"],
    ["Báo cáo tiến độ tháng gửi Ban Giám đốc", "u2", 0, null, 9, "todo", "Q"],
    ["Làm việc với Chủ đầu tư về điều chỉnh mặt bằng tầng hầm", "u1", 0, null, -1, "todo", "QG"],
    ["Cập nhật bản vẽ hoàn công điện nước tầng 4", "u8", 1, null, null, "todo", ""],
    ["Sắp xếp lại bãi tập kết vật liệu khu vực cổng 2", "u6", 2, null, 6, "todo", ""],
    ["Bảo dưỡng máy phát điện dự phòng công trường", "u6", 2, null, 4, "todo", ""],
    // Sổ chỉ đạo của Tổng Giám đốc
    ["Báo cáo phương án bù tiến độ phần thô khối A", "u2", 0, null, -1, "in_progress", "QGC"],
    ["Rà soát hồ sơ thanh toán đợt 3, nộp Chủ đầu tư trong tuần", "u5", 3, null, 3, "todo", "QGC"],
    ["Đánh giá thầu phụ cốp pha, đề xuất thay thế nếu không đạt", "u2", 0, null, -2, "todo", "QC"],
    ["Làm việc với nhà cung cấp thép tiền chế về việc giao hàng chậm", "u12", 2, null, -4, "todo", "QGC", undefined, "p2"],
    ["Bổ sung 2 tổ lắp dựng, tăng ca bù 10 ngày chậm", "u12", 0, -1, 2, "in_progress", "QGC", undefined, "p2"],
    ["Kiểm tra an toàn cẩu tháp tất cả công trường", "u9", 4, null, -6, "done", "QGC", undefined, ""],
    ["Lập kế hoạch dòng tiền quý I toàn công ty", "u3", 5, null, 10, "todo", "QC", undefined, ""],
    ["Chuẩn bị hồ sơ năng lực dự thầu gói trường học Long Biên", "u3", 5, -2, 6, "in_progress", "QC", undefined, ""],
    // Nhà xưởng KCN Phố Nối B
    ["Nghiệm thu móng cột nhà xưởng trục A-D", "u12", 1, null, -20, "done", "QG", undefined, "p2"],
    ["Lắp dựng kèo thép nhịp 1-6", "u12", 1, -15, -5, "in_progress", "QG", ["Lắp cột", "Lắp kèo", "Giằng mái", "Căn chỉnh, siết bu lông"], "p2"],
    ["Lắp dựng kèo thép nhịp 7-12", "u12", 1, -2, 8, "todo", "Q", undefined, "p2"],
    ["Đặt hàng tôn lợp và xà gồ đợt 2", "u6", 2, null, -3, "todo", "QG", undefined, "p2"],
    ["Nhập kho bu lông neo, bản mã", "u6", 2, null, -12, "done", "", undefined, "p2"],
    ["Hồ sơ thanh toán đợt 1 nhà xưởng", "u5", 3, -8, 2, "in_progress", "Q", undefined, "p2"],
    ["Kiểm tra an toàn làm việc trên cao khi lắp kèo", "u9", 4, null, 0, "todo", "G", undefined, "p2"],
    ["Đổ bê tông nền nhà xưởng khu A (1.200 m²)", "u12", 1, 5, 9, "todo", "Q", undefined, "p2"],
    ["Thí nghiệm kéo, uốn mẫu thép kết cấu", "u7", 4, null, -7, "done", "Q", undefined, "p2"],
    ["Lập bản vẽ hoàn công móng nhà xưởng", "u10", 1, null, 6, "todo", "", undefined, "p2"],
    ["Xử lý sai lệch tim cột trục C5 (phiếu NCR-003)", "u7", 4, null, -2, "in_progress", "QG", undefined, "p2"],
    ["Đối chiếu khối lượng thầu phụ lắp dựng thép", "u5", 3, null, 12, "todo", "", undefined, "p2"],
    // Trường THCS Ngọc Thụy
    ["Bàn giao mặt bằng, khởi công trường THCS", "u13", 0, null, -30, "done", "Q", undefined, "p3"],
    ["Thi công cọc khoan nhồi đợt 1 (24 cọc)", "u13", 1, -25, -10, "done", "QG", undefined, "p3"],
    ["Thi công cọc khoan nhồi đợt 2 (24 cọc)", "u13", 1, -9, 4, "in_progress", "QG", ["Khoan tạo lỗ", "Hạ lồng thép", "Đổ bê tông cọc", "Nhật ký từng cọc"], "p3"],
    ["Siêu âm kiểm tra cọc đợt 1", "u7", 4, null, -6, "done", "Q", undefined, "p3"],
    ["Đào đất hố móng khối lớp học", "u13", 1, 5, 15, "todo", "Q", undefined, "p3"],
    ["Đặt hàng thép móng 85 tấn", "u6", 2, null, 3, "todo", "QG", undefined, "p3"],
    ["Hồ sơ tạm ứng hợp đồng", "u5", 3, null, -15, "done", "Q", undefined, "p3"],
    ["Kế hoạch an toàn khi thi công cạnh trường đang học", "u9", 4, -1, 2, "in_progress", "QG", undefined, "p3"],
    ["Phương án giao thông công trường giờ tan học", "u13", 0, null, 6, "todo", "Q", undefined, "p3"],
    ["Hoàn công cọc khoan nhồi đợt 1", "u10", 1, null, 8, "todo", "", undefined, "p3"],
    // Phố Nối: bổ sung đủ các mảng
    ["Duyệt bản vẽ chế tạo kết cấu thép nhà xưởng", "u15", 1, -60, -50, "done", "Q", undefined, "p2"],
    ["Nghiệm thu bu lông neo trước khi đổ bê tông móng", "u14", 1, null, -42, "done", "QG", undefined, "p2"],
    ["Ký hợp đồng thầu phụ lắp dựng kết cấu thép", "u11", 0, -55, -48, "done", "Q", undefined, "p2"],
    ["Huấn luyện an toàn khởi công cho tổ lắp dựng", "u9", 4, null, -45, "done", "Q", undefined, "p2"],
    ["Đổ bê tông móng cột trục E-H", "u14", 1, -30, -26, "done", "QG", undefined, "p2"],
    ["Kiểm tra mối hàn kết cấu thép tại xưởng chế tạo", "u7", 4, null, -18, "done", "Q", undefined, "p2"],
    ["Hồ sơ tạm ứng hợp đồng nhà xưởng", "u5", 3, null, -40, "done", "Q", undefined, "p2"],
    ["Báo cáo tuần gửi Chủ đầu tư Phố Nối", "u12", 0, null, -3, "done", "", undefined, "p2"],
    ["Đo kiểm tra tim cột, cao độ đỉnh cột trục A-D", "u15", 1, null, -1, "in_progress", "QG", undefined, "p2"],
    ["Lập kế hoạch bù tiến độ lắp dựng thép (10 ngày chậm)", "u11", 0, -2, 1, "in_progress", "QG", ["Rà khối lượng còn lại", "Tính nhân lực, cẩu cần thêm", "Trình Ban TGĐ duyệt"], "p2"],
    ["Nghiệm thu lắp dựng kèo nhịp 1-3", "u14", 1, null, 2, "todo", "QG", undefined, "p2"],
    ["Đặt hàng cửa cuốn, cửa thép nhà xưởng", "u6", 2, null, 14, "todo", "", undefined, "p2"],
    ["Biện pháp thi công lợp mái tôn trên cao", "u14", 1, null, 10, "todo", "Q", undefined, "p2"],
    ["Thuê thêm 1 cẩu bánh lốp 25 tấn", "u3", 2, null, 1, "todo", "QG", undefined, "p2"],
    ["Kiểm tra dây cứu sinh, lưới an toàn khu lắp kèo", "u9", 4, null, -1, "todo", "QG", undefined, "p2"],
    ["Hồ sơ thanh toán đợt 2 (kết cấu thép)", "u5", 3, null, 20, "todo", "Q", undefined, "p2"],
    ["Nghiệm thu nền đầm chặt khu A trước khi đổ bê tông", "u7", 4, null, 4, "todo", "Q", undefined, "p2"],
    ["Họp giao ban tuần với Chủ đầu tư Phố Nối", "u12", 0, null, 2, "todo", "Q", undefined, "p2"],
    // Ngọc Thụy: bổ sung đủ các mảng
    ["Xin giấy phép xây dựng và thông báo khởi công", "u11", 0, -50, -35, "done", "Q", undefined, "p3"],
    ["Khảo sát hiện trạng công trình lân cận trước khi thi công", "u16", 1, null, -33, "done", "Q", undefined, "p3"],
    ["Lắp dựng rào tôn, biển báo công trường cạnh trường học", "u9", 4, null, -28, "done", "QG", undefined, "p3"],
    ["Định vị tim cọc khoan nhồi", "u17", 1, null, -27, "done", "QG", undefined, "p3"],
    ["Ký hợp đồng thầu phụ khoan cọc nhồi", "u11", 0, null, -31, "done", "Q", undefined, "p3"],
    ["Thí nghiệm dung dịch bentonite", "u7", 4, null, -20, "done", "", undefined, "p3"],
    ["Nhập kho thép lồng cọc 60 tấn", "u6", 2, null, -22, "done", "G", undefined, "p3"],
    ["Báo cáo tuần gửi Ban QLDA Long Biên", "u13", 0, null, -2, "done", "", undefined, "p3"],
    ["Nghiệm thu lồng thép cọc đợt 2", "u16", 1, null, 0, "in_progress", "QG", undefined, "p3"],
    ["Theo dõi lún, nứt nhà dân lân cận khi khoan cọc", "u17", 1, -9, 4, "in_progress", "Q", undefined, "p3"],
    ["Đối chiếu khối lượng cọc đợt 1 với thầu phụ", "u5", 3, null, 3, "in_progress", "Q", undefined, "p3"],
    ["Lập biện pháp thi công móng, đào đất hố móng", "u16", 1, null, 4, "todo", "QG", undefined, "p3"],
    ["Siêu âm kiểm tra cọc đợt 2", "u7", 4, null, 9, "todo", "Q", undefined, "p3"],
    ["Đặt bê tông thương phẩm cho đài móng", "u6", 2, null, 16, "todo", "", undefined, "p3"],
    ["Kế hoạch vận chuyển đất thải ra ngoài giờ học", "u13", 0, null, 5, "todo", "Q", undefined, "p3"],
    ["Hồ sơ thanh toán đợt 1 (cọc khoan nhồi)", "u5", 3, null, 12, "todo", "Q", undefined, "p3"],
    ["Kiểm tra an toàn điện tạm, máy khoan cọc", "u9", 4, null, 1, "todo", "G", undefined, "p3"],
    ["Họp giao ban tuần với Ban QLDA Long Biên", "u13", 0, null, 3, "todo", "Q", undefined, "p3"],
    // Khối văn phòng
    ["Hồ sơ dự thầu gói nhà xưởng KCN Quế Võ", "u3", 5, -6, 9, "in_progress", "Q", undefined, ""],
    ["Gia hạn bảo lãnh thực hiện hợp đồng Sông Hồng", "u5", 5, null, 5, "todo", "QG", undefined, ""],
    ["Kiểm định thiết bị nâng hạ toàn công ty quý IV", "u9", 5, null, 14, "todo", "Q", undefined, ""],
  ];
  rows.forEach(([title, assigneeId, dept, start, due, status, flags, items, project = "p1"], i) => {
    const multi = start !== null && due !== null;
    const doneAt = status === "done" && due !== null ? at(due + (i % 5 === 0 ? 1 : 0), 10) : null;
    tasks.push(
      base({
        id: `t${48 + i}`,
        title,
        assigneeId,
        department: DEPTS[dept],
        important: flags.includes("Q"),
        urgent: flags.includes("G"),
        timeType: due === null ? "none" : multi ? "multi" : "single",
        startDate: multi ? d(start) : null,
        dueDate: due === null ? null : d(due),
        status,
        completedAt: doneAt,
        projectId: project || null,
        directive: flags.includes("C"),
        createdBy: flags.includes("C") || dept === 5 ? "u1" : dept === 0 ? "u1" : "u2",
        createdAt: at(Math.min(start ?? due ?? 0, due ?? 0) - 7, 2),
        checklist: items ? ck(items.map((t, k) => [t, status === "done" || k < 1] as [string, boolean])) : [],
      }),
    );
  });

  tasks.push(...buildHistory(today, base));

  const notifications: AppNotification[] = [
    { id: "n1", userId: "u1", title: "Việc quá hạn", body: "Lập hồ sơ thanh toán đợt 3 gửi Chủ đầu tư đã quá hạn 1 ngày", taskId: "t2", read: false, createdAt: at(0, 1) },
    { id: "n2", userId: "u1", title: "Hoàn thành", body: "Trần Thị Bình đã hoàn thành: Nghiệm thu chống thấm sàn mái khối B", taskId: "t18", read: false, createdAt: at(-1, 9) },
    { id: "n4", userId: "u1", title: "Bạn được nhắc tên", body: "Trần Thị Bình: đề nghị anh duyệt kế hoạch đổ bê tông sàn tầng 5", taskId: "t40", read: false, createdAt: at(0, 2) },
    { id: "n5", userId: "u1", title: "Phiếu NCR quá hạn", body: "Xử lý vết nứt chân cột C5 tầng 2 đã quá hạn 3 ngày", taskId: "t42", read: true, createdAt: at(-1, 1) },
    { id: "n3", userId: "u4", title: "Bạn được nhắc tên", body: "Trần Thị Bình: nhớ chụp ảnh con kê trước khi mời TVGS", taskId: "t1", read: false, createdAt: at(0, 1) },
  ];

  return { users: SEED_USERS, projects, tasks: tasks.map(withEvidence), notifications };
}

/**
 * Dữ liệu mẫu đủ hồ sơ: việc nào cũng có tài liệu đầu vào, việc đã xong có link kết quả.
 * Ví dụ "Nghiệm thu cốt thép sàn tầng 4" → đầu vào "Bản vẽ kết cấu", kết quả "Biên bản nghiệm thu" + "Ảnh hiện trường".
 * Link mẫu trỏ tới Google Drive, khi dùng thật thay bằng link file thật.
 */
const DRIVE = "https://drive.google.com/";
const SHEET = "https://docs.google.com/spreadsheets/";
const OUTPUT_BY_KEYWORD: [RegExp, string, string][] = [
  [/nghiệm thu/i, "Biên bản nghiệm thu có chữ ký TVGS (scan)", DRIVE],
  [/bê tông|đổ /i, "Phiếu giao nhận bê tông + nhật ký đổ", DRIVE],
  [/thí nghiệm|ép mẫu|nén mẫu/i, "Kết quả thí nghiệm (PDF)", DRIVE],
  [/thanh toán|tạm ứng|công nợ|quyết toán|khối lượng/i, "Hồ sơ thanh toán đã nộp + bảng khối lượng", SHEET],
  [/hợp đồng|phụ lục|báo giá|chọn thầu|đấu thầu/i, "Hợp đồng / phụ lục đã ký (scan)", DRIVE],
  [/vật tư|đặt hàng|thép|xi măng|nhập/i, "Phiếu nhập kho + chứng chỉ CO/CQ", DRIVE],
  [/an toàn|hse|huấn luyện|atlđ|pccc/i, "Biên bản kiểm tra an toàn + danh sách ký", DRIVE],
  [/họp|giao ban/i, "Biên bản họp và bảng phân công", DRIVE],
  [/báo cáo/i, "File báo cáo đã gửi (PDF)", DRIVE],
  [/ncr|nứt|thấm|sửa|khắc phục/i, "Biên bản đóng NCR + ảnh trước/sau khắc phục", DRIVE],
  [/bản vẽ|shop|biện pháp|thiết kế/i, "Bản vẽ / biện pháp đã được duyệt", DRIVE],
];
const INPUT_BY_DEPT: Record<string, [string, string]> = {
  "Ban Tổng Giám đốc": ["Văn bản chỉ đạo / kết luận họp Ban TGĐ", DRIVE],
  "Ban Chỉ huy công trường": ["Tiến độ thi công tổng thể (bản duyệt)", SHEET],
  "Kỹ thuật thi công": ["Bản vẽ thi công được duyệt", DRIVE],
  "Kế hoạch - Vật tư": ["Kế hoạch vật tư tháng", SHEET],
  "Hợp đồng - Thanh toán (QS)": ["Hợp đồng và bảng khối lượng", SHEET],
  "An toàn - Chất lượng (HSE, QA/QC)": ["Kế hoạch ATLĐ / ITP kiểm tra chất lượng", DRIVE],
};
const SITE_DEPTS = ["Ban Chỉ huy công trường", "Kỹ thuật thi công", "An toàn - Chất lượng (HSE, QA/QC)"];

function withEvidence(t: Task): Task {
  const inputLinks = t.inputLinks.length ? t.inputLinks : [INPUT_BY_DEPT[t.department] ?? ["Tài liệu liên quan", DRIVE]].map(([label, url]) => ({ label, url }));
  if (t.status !== "done" || t.outputLinks.length) return { ...t, inputLinks };
  const hit = OUTPUT_BY_KEYWORD.find(([re]) => re.test(t.title));
  const outputLinks = [{ label: hit?.[1] ?? "Báo cáo hoàn thành (PDF)", url: hit?.[2] ?? DRIVE }];
  if (SITE_DEPTS.includes(t.department)) outputLinks.push({ label: "Ảnh hiện trường (album)", url: "https://photos.google.com/" });
  return { ...t, inputLinks, outputLinks };
}

/** Tiền tố mã của dữ liệu mẫu trên Firestore: xóa mẫu chỉ đụng các bản ghi này, không đụng việc thật */
export const SAMPLE_PREFIX = "mau-";

/**
 * Bộ mẫu gắn vào hệ thống thật: người đứng đầu (u1) là Owner đang dùng, các nhân sự còn lại là hồ sơ mẫu "mau-…".
 * Dùng chung cho nút "Nạp dữ liệu mẫu" trong app và lệnh nạp tự động trên GitHub.
 */
export function buildOwnerSample(ownerUid: string, today: string) {
  const seed = buildSeed(today);
  const id = (u: string) => (u === "u1" ? ownerUid : SAMPLE_PREFIX + u);
  return {
    users: seed.users.filter((u) => u.id !== "u1").map((u) => ({ ...u, id: id(u.id), email: "" })),
    projects: seed.projects.map((p) => ({ ...p, id: SAMPLE_PREFIX + p.id, directorId: p.directorId && id(p.directorId), siteManagerId: p.siteManagerId && id(p.siteManagerId), memberIds: (p.memberIds ?? []).map(id) })),
    tasks: seed.tasks.map((t) => ({
      ...t,
      id: SAMPLE_PREFIX + t.id,
      assigneeId: t.assigneeId && id(t.assigneeId),
      watcherIds: t.watcherIds.map(id),
      createdBy: id(t.createdBy),
      projectId: t.projectId ? SAMPLE_PREFIX + t.projectId : null,
      comments: t.comments.map((c) => ({ ...c, userId: id(c.userId) })),
    })),
  };
}
