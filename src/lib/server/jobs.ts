import "server-only";
import { newId } from "../tasks";
import type { AppNotification, Task, User } from "../types";
import { addInAppNotifications, isProduction, loadData, resolveConfig, saveAiReport, serverToday, spawnRecurring } from "./context";
import { managersOf, personalReminder, watchList } from "../reminders";
import { aiMorningBrief } from "./ai-assistant";
import { afternoonCheck, dailyDigest, personalDigest, weeklyReport } from "./messages";
import { previewText, sendAll, sendZaloBotTo, splitIds } from "./notification-service";

/**
 * Việc chạy theo lịch, dùng chung cho API Vercel (cron.ts) và lịch chạy GitHub (scripts/cron-runner.ts):
 * nạp dữ liệu → sinh việc định kỳ → soạn tin → gửi các kênh → chuông trong app.
 */
export async function runJob(kind: "daily" | "weekly" | "afternoon", clientConfig?: unknown) {
  const today = serverToday();
  const config = await resolveConfig(clientConfig);
  const { tasks, users, projects } = await loadData();
  const spawned = kind === "daily" ? await spawnRecurring(tasks, today) : 0;

  const message =
    kind === "daily" ? dailyDigest(tasks, users, today, projects) : kind === "weekly" ? weeklyReport(tasks, users, today, projects) : afternoonCheck(tasks, users, today);
  const enabled = !!message && (kind === "daily" ? config.events.dailyDigest : kind === "weekly" ? config.events.weeklyReport : config.events.afternoonCheck);
  const results = enabled && message ? await sendAll(config, message) : [];

  if (kind === "daily" && isProduction()) await addInAppNotifications(dailyBells(tasks, users, today));

  // Nhắc riêng qua Zalo cho người đã liên kết (trừ người đã nhận bản tổng hợp công ty)
  if (kind === "daily" && enabled && config.zalo.enabled && config.zalo.mode === "bot" && config.zalo.botToken) {
    const companyIds = new Set(splitIds(config.zalo.botChatIds));
    for (const u of users) {
      if (!u.zaloChatId || companyIds.has(u.zaloChatId)) continue;
      const m = personalDigest(u, tasks, users, today);
      if (!m) continue;
      await sendZaloBotTo(config.zalo.botToken, u.zaloChatId, m)
        .then(() => results.push({ channel: "zalo", ok: true }))
        .catch((e) => results.push({ channel: "zalo", ok: false, error: `${u.name}: ${(e as Error).message}` }));
    }
  }

  // Trợ lý AI (khi có khóa): nhận định buổi sáng gửi kèm qua các kênh và lưu để xem trong trang Điều hành công ty
  if (kind === "daily" && enabled) {
    const ai = await aiMorningBrief(tasks, users, projects, today).catch((e) => (console.error("Trợ lý AI lỗi:", e), null));
    if (ai) {
      results.push(...(await sendAll(config, { title: "🤖 Trợ lý AI: việc nên chỉ đạo hôm nay", sections: [{ lines: ai.split("\n").filter(Boolean) }] })));
      await saveAiReport(ai);
    }
  }

  return { mode: isProduction() ? "production" : "demo", today, spawnedRecurring: spawned, sent: enabled, results, preview: message ? previewText(message) : "Không có việc cần nhắc" };
}

/**
 * Chuông trong app mỗi sáng:
 * - Người làm: việc còn 3 ngày, 1 ngày, đến hạn hôm nay, quá hạn (nhắc lại mỗi ngày tới khi xong).
 * - Quản lý phòng: việc của phòng trễ từ 2 ngày. Ban TGĐ: việc trễ từ 5 ngày, việc chưa có người nhận.
 */
function dailyBells(tasks: Task[], users: User[], today: string): AppNotification[] {
  const createdAt = new Date().toISOString();
  const notes: AppNotification[] = [];
  const add = (userId: string, title: string, body: string, taskId?: string) =>
    notes.push({ id: newId(), userId, title, body, ...(taskId ? { taskId } : {}), read: false, createdAt });

  for (const t of tasks) {
    const r = t.assigneeId ? personalReminder(t, today) : null;
    if (r) add(t.assigneeId!, `${r}: ${t.title}`, t.dueDate ? `Hạn ${t.dueDate.split("-").reverse().join("/")}` : "", t.id);
  }
  const w = watchList(tasks, today);
  const owners = users.filter((u) => u.role === "owner");
  for (const t of w.escalateManager)
    for (const m of managersOf(t, users)) add(m.id, `Leo thang: ${t.title}`, `Việc của phòng ${t.department} đã trễ hạn, cần đôn đốc`, t.id);
  for (const t of w.escalateOwner) for (const o of owners) add(o.id, `Báo Ban TGĐ: ${t.title}`, "Trễ hạn nhiều ngày, cần chỉ đạo xử lý", t.id);
  if (w.unassigned.length) for (const o of owners) add(o.id, `${w.unassigned.length} việc chưa có người nhận`, w.unassigned.slice(0, 3).map((t) => t.title).join("; "));
  return compact(notes);
}

/** Mỗi người tối đa 3 chuông riêng; nhiều hơn thì gộp thành 1 chuông tóm tắt để không bị ngập */
function compact(notes: AppNotification[]): AppNotification[] {
  const byUser = new Map<string, AppNotification[]>();
  for (const n of notes) byUser.set(n.userId, [...(byUser.get(n.userId) ?? []), n]);
  return [...byUser.values()].flatMap((list) =>
    list.length <= 3
      ? list
      : [{ id: list[0].id, userId: list[0].userId, title: `Nhắc việc sáng nay: ${list.length} việc cần chú ý`, body: list.slice(0, 4).map((n) => n.title).join(" · ") + " …", read: false, createdAt: list[0].createdAt }],
  );
}
