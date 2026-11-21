import { addDays, addMonths, startOfWeek } from "./dates";
import type { AppNotification, Task, User } from "./types";

export const SEED_USERS: User[] = [
  { id: "u1", name: "Nguyễn Văn An", email: "an@demo.vn", role: "owner", department: "Ban Chỉ huy công trường", title: "Giám đốc dự án", color: "#2563eb" },
  { id: "u2", name: "Trần Thị Bình", email: "binh@demo.vn", role: "manager", department: "Kỹ thuật thi công", title: "Chỉ huy trưởng công trường", color: "#db2777" },
  { id: "u3", name: "Lê Hoàng Cường", email: "cuong@demo.vn", role: "manager", department: "Kế hoạch - Vật tư", title: "Trưởng ban Kế hoạch - Vật tư", color: "#059669" },
  { id: "u4", name: "Phạm Minh Dũng", email: "dung@demo.vn", role: "editor", department: "Kỹ thuật thi công", title: "Kỹ sư giám sát", color: "#d97706" },
  { id: "u5", name: "Võ Thị Hà", email: "ha@demo.vn", role: "member", department: "Hợp đồng - Thanh toán (QS)", title: "Kỹ sư QS (khối lượng, thanh toán)", color: "#7c3aed" },
  { id: "u6", name: "Đỗ Quang Huy", email: "huy@demo.vn", role: "member", department: "Kế hoạch - Vật tư", title: "Thủ kho, cán bộ vật tư", color: "#0891b2" },
  { id: "u7", name: "Hoàng Thu Lan", email: "lan@demo.vn", role: "member", department: "An toàn - Chất lượng (HSE, QA/QC)", title: "Kỹ sư QA/QC", color: "#dc2626" },
  { id: "u8", name: "Bùi Đức Long", email: "long@demo.vn", role: "editor", department: "Kỹ thuật thi công", title: "Kỹ sư MEP (điện nước)", color: "#4f46e5" },
  { id: "u9", name: "Ngô Thị Mai", email: "mai@demo.vn", role: "member", department: "An toàn - Chất lượng (HSE, QA/QC)", title: "Cán bộ an toàn HSE", color: "#0d9488" },
  { id: "u10", name: "Trịnh Văn Nam", email: "nam@demo.vn", role: "member", department: "Kỹ thuật thi công", title: "Kỹ sư trắc đạc", color: "#ea580c" },
];

/** Dự án giả định dùng cho bản Demo */
export const DEMO_PROJECT = "Chung cư Sông Hồng Residence · Gói thầu thi công phần thân";

/** Dữ liệu mẫu tính theo ngày hôm nay, để mở app lúc nào cũng thấy đủ quá hạn, sắp hạn, đã xong */
export function buildSeed(today: string): { users: User[]; tasks: Task[]; notifications: AppNotification[] } {
  const d = (n: number) => addDays(today, n);
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
    requireOutput: false,
    recurrence: null,
    recurrenceSpawned: false,
    comments: [],
    completedAt: null,
    createdBy: "u1",
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
      id: "t10", title: "Chuẩn bị hồ sơ dự thầu gói hạ tầng kỹ thuật", assigneeId: "u3", watcherIds: ["u1"], department: "Kế hoạch - Vật tư", important: true,
      timeType: "multi", startDate: d(-3), dueDate: d(10), status: "in_progress",
      checklist: ck([["Mua HSMT", true], ["Khảo sát hiện trường", true], ["Lập biện pháp thi công", false], ["Lập dự toán dự thầu", false], ["Bảo lãnh dự thầu", false]]),
    }),
    base({
      id: "t11", title: "Sửa máy bơm bê tông số 2", assigneeId: "u6", department: "Kế hoạch - Vật tư", urgent: true, dueDate: d(-2), status: "on_hold",
      comments: [{ id: "cm2", userId: "u6", text: "Đang chờ phụ tùng từ nhà cung cấp, dự kiến 3 ngày.", createdAt: at(-1, 3) }],
    }),
    base({ id: "t12", title: "Họp giao ban đầu tuần", assigneeId: "u1", department: "Ban Chỉ huy công trường", important: true, dueDate: lastMon, status: "done", completedAt: `${lastMon}T03:00:00.000Z`, recurrence: { freq: "weekly", weekdays: [1] }, recurrenceSpawned: true }),
    base({ id: "t13", title: "Họp giao ban đầu tuần", assigneeId: "u1", department: "Ban Chỉ huy công trường", important: true, dueDate: nextMon, recurrence: { freq: "weekly", weekdays: [1] } }),
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
  // Cột: tiêu đề, người làm, phòng ban (chỉ số DEPTS), ngày bắt đầu, hạn chót (số ngày so với hôm nay), trạng thái, cờ (Q = quan trọng, G = gấp), checklist
  type Row = [string, string | null, number, number | null, number | null, Task["status"], string, string[]?];
  const DEPTS = ["Ban Chỉ huy công trường", "Kỹ thuật thi công", "Kế hoạch - Vật tư", "Hợp đồng - Thanh toán (QS)", "An toàn - Chất lượng (HSE, QA/QC)"];
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
    ["Báo cáo tiến độ tháng gửi Ban Giám đốc", "u1", 0, null, 9, "todo", "Q"],
    ["Làm việc với Chủ đầu tư về điều chỉnh mặt bằng tầng hầm", "u1", 0, null, -1, "todo", "QG"],
    ["Cập nhật bản vẽ hoàn công điện nước tầng 4", "u8", 1, null, null, "todo", ""],
    ["Sắp xếp lại bãi tập kết vật liệu khu vực cổng 2", "u6", 2, null, 6, "todo", ""],
    ["Bảo dưỡng máy phát điện dự phòng công trường", "u6", 2, null, 4, "todo", ""],
  ];
  rows.forEach(([title, assigneeId, dept, start, due, status, flags, items], i) => {
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
        createdBy: dept === 0 ? "u1" : "u2",
        createdAt: at(Math.min(start ?? due ?? 0, due ?? 0) - 7, 2),
        checklist: items ? ck(items.map((t, k) => [t, status === "done" || k < 1] as [string, boolean])) : [],
      }),
    );
  });

  const notifications: AppNotification[] = [
    { id: "n1", userId: "u1", title: "Việc quá hạn", body: "Lập hồ sơ thanh toán đợt 3 gửi Chủ đầu tư đã quá hạn 1 ngày", taskId: "t2", read: false, createdAt: at(0, 1) },
    { id: "n2", userId: "u1", title: "Hoàn thành", body: "Trần Thị Bình đã hoàn thành: Nghiệm thu chống thấm sàn mái khối B", taskId: "t18", read: false, createdAt: at(-1, 9) },
    { id: "n4", userId: "u1", title: "Bạn được nhắc tên", body: "Trần Thị Bình: đề nghị anh duyệt kế hoạch đổ bê tông sàn tầng 5", taskId: "t40", read: false, createdAt: at(0, 2) },
    { id: "n5", userId: "u1", title: "Phiếu NCR quá hạn", body: "Xử lý vết nứt chân cột C5 tầng 2 đã quá hạn 3 ngày", taskId: "t42", read: true, createdAt: at(-1, 1) },
    { id: "n3", userId: "u4", title: "Bạn được nhắc tên", body: "Trần Thị Bình: nhớ chụp ảnh con kê trước khi mời TVGS", taskId: "t1", read: false, createdAt: at(0, 1) },
  ];

  return { users: SEED_USERS, tasks, notifications };
}
