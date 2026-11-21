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
import type { NotificationConfig, Project, User } from "../src/lib/types";

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

const LINK = /^\s*LK\s+([A-Za-z0-9]{6})\s*$/i;

/**
 * Đọc tin nhắn người dùng gửi cho bot (15 phút một lần):
 * - "LK ABC123" (mã ở Cài đặt > Hồ sơ của tôi) → liên kết Zalo với tài khoản, từ đó nhận nhắc việc riêng.
 * - Tin quan trọng → tự tạo việc trong app, bot trả lời "Đã tạo việc".
 * - Người đầu tiên nhắn bot (người cài đặt) và Ban TGĐ nhận bản tổng hợp toàn công ty; người khác chỉ nhận việc của mình,
 *   để không lộ việc dự án khác.
 * Ví dụ: chỉ huy trưởng nhắn "Gấp: SH thiếu thép D16 sàn tầng 6" → việc Khẩn cấp ở dự án Sông Hồng, hạn ngày mai.
 */
async function processInbox() {
  const { db } = getAdmin()!;
  const ref = db.doc("settings/integrations");
  const snap = await ref.get();
  const cfg: NotificationConfig = withDefaults(snap.exists ? (snap.data() as NotificationConfig) : null);
  const token = cfg.zalo.botToken;
  if (cfg.zalo.mode !== "bot" || !token) return;
  const companyIds = splitIds(cfg.zalo.botChatIds);
  const before = companyIds.join(",");
  let projects: Project[] | null = null;
  let users: User[] | null = null;
  const loadUsers = async () => (users ??= (await db.collection("users").get()).docs.map((d) => ({ ...(d.data() as User), id: d.id })));
  const ownerId = ((await db.doc("meta/owner").get()).data()?.uid as string | undefined) ?? "";
  const today = serverToday();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const send = (chat_id: string, text: string) => zaloBot(token, "sendMessage", { chat_id, text });

  for (let i = 0; i < 50; i++) {
    const r = await zaloBot(token, "getUpdates", { timeout: 1 }).catch(() => ({ ok: false }) as { ok?: boolean; result?: unknown });
    const list = (Array.isArray(r.result) ? r.result : r.result ? [r.result] : []) as ZaloUpdate[];
    if (!r.ok || !list.length) break;
    for (const u of list) {
      const m = u.message;
      const chatId = m?.chat?.id;
      if (!chatId) continue;
      const sender = m?.from?.display_name ?? "anh/chị";
      const text = (m?.text ?? "").trim();
      const all = await loadUsers();
      const linked = all.find((x) => x.zaloChatId === chatId);

      // Liên kết tài khoản
      const lk = text.match(LINK);
      if (lk) {
        const user = all.find((x) => x.id.slice(0, 6).toUpperCase() === lk[1].toUpperCase());
        if (!user) {
          await send(chatId, "Mã liên kết không đúng. Mở app, vào Cài đặt > Hồ sơ của tôi để xem mã.");
          continue;
        }
        await db.doc(`users/${user.id}`).set({ zaloChatId: chatId }, { merge: true });
        user.zaloChatId = chatId;
        const boss = user.role === "owner" || user.department === "Ban Tổng Giám đốc";
        if (boss && !companyIds.includes(chatId)) companyIds.push(chatId);
        await send(chatId, `Đã liên kết Zalo với tài khoản ${user.name}. Bot nhắc riêng việc của anh/chị lúc 8:00 sáng${boss ? ", kèm bản tổng hợp toàn công ty" : ""}. Muốn giao việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
        continue;
      }

      // Người đầu tiên nhắn bot (thường là người cài đặt) nhận bản tổng hợp công ty
      const first = companyIds.length === 0;
      if (first) companyIds.push(chatId);
      const known = !!linked || companyIds.includes(chatId);

      const c = text ? classify(text) : { create: false, urgent: false };
      if (c.create && m?.message_id) {
        projects ??= (await db.collection("projects").get()).docs.map((d) => ({ ...(d.data() as Project), id: d.id }));
        const nowIso = new Date().toISOString();
        const task = taskFromZalo({ messageId: m.message_id, text, sender: linked?.name ?? sender, urgent: c.urgent, projects, ownerId: linked?.id ?? ownerId, today, nowIso });
        await db.doc(`tasks/${task.id}`).set(task);
        if (ownerId)
          await db.collection("notifications").add({ userId: ownerId, title: c.urgent ? "Việc khẩn từ Zalo" : "Việc mới từ Zalo", body: `${linked?.name ?? sender}: ${task.title}`, taskId: task.id, read: false, createdAt: nowIso });
        const p = projects.find((x) => x.id === task.projectId);
        await send(chatId, `Đã tạo việc: ${task.title}${p ? ` (dự án ${p.name})` : ""}, hạn ${formatDate(task.dueDate)}${c.urgent ? ", mức Khẩn cấp" : ""}. Xem tại ${appUrl}/tasks`);
        console.log(`Tạo việc từ Zalo: ${task.id}`);
      } else if (first) {
        await send(chatId, `Đã đăng ký nhận bản tổng hợp toàn công ty cho ${sender}: 8:00 sáng, 16:00 việc hạn hôm nay chưa xong, 20:00 Chủ nhật báo cáo tuần. Muốn giao việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
      } else if (!known) {
        await send(chatId, `Chào ${sender}. Để nhận nhắc việc riêng, mở app Task Tracker Pro, vào Cài đặt > Hồ sơ của tôi, lấy mã rồi nhắn cho bot, ví dụ "LK AB12CD". Muốn báo việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
      } else if (text) {
        await send(chatId, `Tin này chưa thành việc. Muốn tạo việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
      }
    }
  }
  if (companyIds.join(",") !== before) {
    await ref.set({ zalo: { ...cfg.zalo, botChatIds: companyIds.join(", ") } }, { merge: true });
    console.log("Cập nhật người nhận bản tổng hợp Zalo");
  }
}

const kind = process.argv[2];
if (kind !== "daily" && kind !== "weekly" && kind !== "afternoon" && kind !== "inbox") throw new Error("Dùng: daily | weekly | afternoon | inbox");

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
