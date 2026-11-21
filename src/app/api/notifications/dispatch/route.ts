import { NextResponse } from "next/server";
import { resolveConfig } from "@/lib/server/context";
import { currentUser } from "@/lib/server/guard";
import { eventMessage } from "@/lib/server/messages";
import { sendAll } from "@/lib/server/notification-service";
import type { NotifyEvent } from "@/lib/types";

/** Sự kiện tức thì: giao việc, @nhắc tên, đổi trạng thái quan trọng */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { event, config: clientConfig } = (await req.json()) as { event: NotifyEvent; config?: unknown };
  if (!event?.type || !event.task) return NextResponse.json({ error: "Thiếu dữ liệu sự kiện" }, { status: 400 });

  const config = await resolveConfig(clientConfig);
  if (!config.events[event.type]) return NextResponse.json({ skipped: true, reason: "Sự kiện này đang tắt" });
  const results = await sendAll(config, eventMessage(event));
  return NextResponse.json({ results });
}
