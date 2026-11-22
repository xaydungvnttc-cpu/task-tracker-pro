/**
 * Quy trình mẫu TTC: bộ bước chuẩn theo nghiệp vụ công trường, chèn vào việc bằng một chạm.
 * Mỗi quy trình ghi sẵn hồ sơ phải nộp khi hoàn thành, để người làm biết cần gắn link gì.
 * Ví dụ chọn "Nghiệm thu cốt thép" → 5 bước từ tự kiểm tra đến ký biên bản, hồ sơ nộp: biên bản + ảnh con kê.
 */
export interface ProcessTemplate {
  id: string;
  name: string;
  steps: string[];
  evidence: string[]; // hồ sơ cần nộp khi bấm Hoàn thành
}

export const PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    id: "rebar",
    name: "Nghiệm thu cốt thép",
    steps: ["Tổ đội tự kiểm tra, sửa theo bản vẽ", "Kỹ sư giám sát kiểm tra nội bộ, chụp ảnh con kê, mối nối", "Gửi phiếu yêu cầu nghiệm thu cho TVGS trước 24 giờ", "Nghiệm thu cùng TVGS tại hiện trường", "Ký biên bản, lưu ảnh lên thư mục dự án"],
    evidence: ["Biên bản nghiệm thu có chữ ký TVGS", "Ảnh hiện trường (con kê, mối nối)"],
  },
  {
    id: "concrete",
    name: "Đổ bê tông",
    steps: ["Nghiệm thu cốt thép, cốp pha xong", "Đặt bê tông: mác, khối lượng, giờ xe đến", "Kiểm tra độ sụt, lấy mẫu thí nghiệm", "Đổ, đầm, ghi nhật ký đổ", "Bảo dưỡng bê tông theo quy định"],
    evidence: ["Phiếu giao nhận bê tông", "Nhật ký đổ bê tông", "Biên bản lấy mẫu"],
  },
  {
    id: "payment",
    name: "Hồ sơ thanh toán đợt",
    steps: ["Chốt khối lượng hoàn thành với Ban chỉ huy", "Lập bảng khối lượng, giá trị theo hợp đồng", "Gom biên bản nghiệm thu làm căn cứ", "Trình Giám đốc dự án ký", "Nộp Chủ đầu tư, lấy xác nhận đã nhận"],
    evidence: ["Bảng khối lượng thanh toán", "Văn bản nộp có xác nhận của Chủ đầu tư"],
  },
  {
    id: "ncr",
    name: "Xử lý phiếu NCR",
    steps: ["Chụp ảnh lỗi, ghi vị trí", "Lập biện pháp khắc phục, trình TVGS", "Khắc phục tại hiện trường", "Mời TVGS kiểm tra lại", "Đóng phiếu NCR"],
    evidence: ["Phiếu NCR đã đóng", "Ảnh trước và sau khắc phục"],
  },
  {
    id: "safety",
    name: "Kiểm tra an toàn đầu ca",
    steps: ["Kiểm tra bảo hộ cá nhân (mũ, giày, dây an toàn)", "Kiểm tra giàn giáo, lan can, lưới chống rơi", "Kiểm tra điện tạm, tủ điện, tiếp địa", "Kiểm tra thiết bị nâng (cẩu, vận thăng)", "Ghi sổ, nhắc nhở tổ đội vi phạm"],
    evidence: ["Phiếu kiểm tra an toàn có chữ ký", "Ảnh hiện trường"],
  },
  {
    id: "material",
    name: "Nhập vật tư về công trường",
    steps: ["Đối chiếu đơn hàng: chủng loại, số lượng", "Kiểm tra chứng chỉ CO, CQ", "Lấy mẫu thí nghiệm nếu bắt buộc", "Nhập kho, ghi thẻ kho", "Báo Kế hoạch - Vật tư cập nhật tồn"],
    evidence: ["Phiếu nhập kho", "Chứng chỉ CO, CQ"],
  },
];
