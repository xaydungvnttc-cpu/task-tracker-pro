/**
 * Lịch chạy GitHub Actions (.github/workflows/nhac-viec.yml), thay cho cron Vercel.
 * Ví dụ: 8:00 sáng chạy `node cron-runner.mjs daily` → đọc Firestore → gửi bản nhắc việc qua Zalo Bot.
 *
 * Biến môi trường: FIREBASE_SERVICE_ACCOUNT (nội dung file khóa .json tải từ Firebase), NEXT_PUBLIC_APP_URL.
 */
import { withDefaults } from "../src/lib/notification-config";
import { getAdmin } from "../src/lib/server/admin";
import { runJob } from "../src/lib/server/jobs";
import { serverToday } from "../src/lib/server/context";
import { ZALO_BOT_API, splitIds } from "../src/lib/server/notification-service";
import { classify, taskFromZalo } from "../src/lib/server/zalo-inbox";
import { formatDate } from "../src/lib/dates";
import type { NotificationConfig, Project } from "../src/lib/types";

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) throw new Error("Thiếu secret FIREBASE_SERVICE_ACCOUNT");
const key = JSON.parse(sa) as { project_id: string; client_email: string; private_key: string };
process.env.FIREBASE_ADMIN_PROJECT_ID = key.project_id;
process.env.FIREBASE_ADMIN_CLIENT_EMAIL = key.client_email;
process.env.FIREBASE_ADMIN_PRIVATE_KEY = key.private_key;

async function zaloBot(token: string, method: string, body: unknown) {
  const res = await fetch(`${ZALO_BOT_API}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown };
}

type ZaloUpdate = { message?: { message_id?: string; text?: string; chat?: { id?: string }; from?: { display_name?: string } } };

/**
 * Đọc tin nhắn người dùng gửi cho bot (15 phút một lần):
 * - Người mới nhắn → thêm vào danh sách nhận nhắc việc.
 * - Tin quan trọng → tự tạo việc trong app, bot trả lời "Đã tạo việc".
 * Ví dụ: chỉ huy trưởng nhắn "Gấp: SH thiếu thép D16 sàn tầng 6" → việc Khẩn cấp ở dự án Sông Hồng, hạn ngày mai.
 */
async function processInbox() {
  const { db } = getAdmin()!;
  const ref = db.doc("settings/integrations");
  const snap = await ref.get();
  const cfg: NotificationConfig = withDefaults(snap.exists ? (snap.data() as NotificationConfig) : null);
  const token = cfg.zalo.botToken;
  if (cfg.zalo.mode !== "bot" || !token) return;
  const ids = splitIds(cfg.zalo.botChatIds);
  const added: string[] = [];
  let projects: Project[] | null = null;
  const ownerId = ((await db.doc("meta/owner").get()).data()?.uid as string | undefined) ?? "";
  const today = serverToday();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  for (let i = 0; i < 50; i++) {
    const r = await zaloBot(token, "getUpdates", { timeout: 1 }).catch(() => ({ ok: false }) as { ok?: boolean; result?: unknown });
    const list = (Array.isArray(r.result) ? r.result : r.result ? [r.result] : []) as ZaloUpdate[];
    if (!r.ok || !list.length) break;
    for (const u of list) {
      const m = u.message;
      const chatId = m?.chat?.id;
      if (!chatId) continue;
      const sender = m?.from?.display_name ?? "anh/chị";
      const isNew = !ids.includes(chatId);
      if (isNew) {
        ids.push(chatId);
        added.push(chatId);
      }
      const text = (m?.text ?? "").trim();
      const c = text ? classify(text) : { create: false, urgent: false };
      if (c.create && m?.message_id) {
        projects ??= (await db.collection("projects").get()).docs.map((d) => ({ ...(d.data() as Project), id: d.id }));
        const nowIso = new Date().toISOString();
        const task = taskFromZalo({ messageId: m.message_id, text, sender, urgent: c.urgent, projects, ownerId, today, nowIso });
        await db.doc(`tasks/${task.id}`).set(task);
        if (ownerId)
          await db.collection("notifications").add({ userId: ownerId, title: c.urgent ? "Việc khẩn từ Zalo" : "Việc mới từ Zalo", body: `${sender}: ${task.title}`, taskId: task.id, read: false, createdAt: nowIso });
        const p = projects.find((x) => x.id === task.projectId);
        await zaloBot(token, "sendMessage", {
          chat_id: chatId,
          text: `Đã tạo việc: ${task.title}${p ? ` (dự án ${p.name})` : ""}, hạn ${formatDate(task.dueDate)}${c.urgent ? ", mức Khẩn cấp" : ""}. Xem tại ${appUrl}/tasks`,
        });
        console.log(`Tạo việc từ Zalo: ${task.id}`);
      } else if (isNew) {
        await zaloBot(token, "sendMessage", {
          chat_id: chatId,
          text: `Đã đăng ký nhận nhắc việc Task Tracker Pro cho ${sender}. Bot gửi nhắc 8:00 sáng mỗi ngày và báo cáo 20:00 Chủ nhật. Muốn giao việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:", ví dụ "Gấp: SH thiếu thép D16 sàn tầng 6".`,
        });
      } else if (text) {
        await zaloBot(token, "sendMessage", { chat_id: chatId, text: `Tin này chưa thành việc. Muốn tạo việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".` });
      }
    }
  }
  if (added.length) {
    await ref.set({ zalo: { ...cfg.zalo, botChatIds: ids.join(", ") } }, { merge: true });
    console.log(`Thêm ${added.length} người nhận Zalo mới`);
  }
}

const kind = process.argv[2];
if (kind !== "daily" && kind !== "weekly" && kind !== "inbox") throw new Error("Dùng: daily | weekly | inbox");

await processInbox();
if (kind !== "inbox") {
  const r = await runJob(kind);
  console.log(JSON.stringify({ ...r, preview: undefined }, null, 2));
  console.log(r.preview);
  const failed = r.results.filter((x) => !x.ok);
  if (failed.length) {
    console.error("Gửi lỗi:", failed);
    process.exitCode = 1;
  }
}
