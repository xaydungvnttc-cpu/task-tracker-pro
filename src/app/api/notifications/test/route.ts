import { NextResponse } from "next/server";
import { withDefaults } from "@/lib/notification-config";
import { currentUser } from "@/lib/server/guard";
import { sendAll } from "@/lib/server/notification-service";
import type { ChannelKey, NotificationConfig } from "@/lib/types";

/** Nút "Gửi thử" cho từng kênh, dùng đúng cấu hình đang nhập trên form (chưa cần lưu) */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (user !== "demo" && user?.role !== "owner") return NextResponse.json({ error: "Chỉ Quản trị được gửi thử" }, { status: 403 });
  const { channel, config } = (await req.json()) as { channel: ChannelKey; config: NotificationConfig };
  const results = await sendAll(withDefaults(config), {
    title: "🔔 Tin nhắn thử từ TTC Điều Hành",
    sections: [{ tone: "green", lines: ["Kết nối thành công. Từ giờ kênh này sẽ nhận nhắc việc và báo cáo."] }],
  }, channel);
  return NextResponse.json({ results });
}
