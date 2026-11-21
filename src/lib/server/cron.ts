import "server-only";
import { NextResponse } from "next/server";
import { newId, isOverdue } from "../tasks";
import type { AppNotification } from "../types";
import { addInAppNotifications, isProduction, loadData, resolveConfig, serverToday, spawnRecurring } from "./context";
import { cronAllowed } from "./guard";
import { dailyDigest, weeklyReport } from "./messages";
import { previewText, sendAll } from "./notification-service";

/** Xử lý chung cho 2 cron: kiểm quyền → nạp dữ liệu → sinh việc định kỳ → soạn tin → gửi */
export async function runCron(req: Request, kind: "daily" | "weekly") {
  if (!(await cronAllowed(req))) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const today = serverToday();
  const config = await resolveConfig(body.config);
  const { tasks, users } = await loadData();
  const spawned = await spawnRecurring(tasks, today);

  const message = kind === "daily" ? dailyDigest(tasks, users, today) : weeklyReport(tasks, users, today);
  const enabled = kind === "daily" ? config.events.dailyDigest : config.events.weeklyReport;
  const results = enabled ? await sendAll(config, message) : [];

  // Production: chuông trong app cho từng người có việc quá hạn / đến hạn hôm nay
  if (kind === "daily" && isProduction()) {
    const createdAt = new Date().toISOString();
    const notes: AppNotification[] = [];
    for (const u of users) {
      const mine = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done");
      const od = mine.filter((t) => isOverdue(t, today)).length;
      const dt = mine.filter((t) => t.dueDate === today).length;
      if (od + dt > 0)
        notes.push({ id: newId(), userId: u.id, title: "Nhắc việc sáng nay", body: `Bạn có ${od} việc quá hạn và ${dt} việc đến hạn hôm nay`, read: false, createdAt });
    }
    await addInAppNotifications(notes);
  }

  return NextResponse.json({
    mode: isProduction() ? "production" : "demo",
    today,
    spawnedRecurring: spawned,
    sent: enabled,
    results,
    preview: previewText(message),
  });
}
