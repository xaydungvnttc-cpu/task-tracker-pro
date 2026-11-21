/**
 * Lịch chạy GitHub Actions (.github/workflows/nhac-viec.yml), thay cho cron Vercel.
 * Ví dụ: 8:00 sáng chạy `node cron-runner.mjs daily` → đọc Firestore → gửi bản nhắc việc qua Zalo Bot.
 *
 * Biến môi trường: FIREBASE_SERVICE_ACCOUNT (nội dung file khóa .json tải từ Firebase), NEXT_PUBLIC_APP_URL.
 */
import { withDefaults } from "../src/lib/notification-config";
import { getAdmin } from "../src/lib/server/admin";
import { runJob } from "../src/lib/server/jobs";
import { ZALO_BOT_API, splitIds } from "../src/lib/server/notification-service";
import type { NotificationConfig } from "../src/lib/types";

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

/**
 * Ai nhắn cho bot thì tự thêm chat_id vào danh sách người nhận và được bot trả lời xác nhận.
 * Ví dụ: chỉ huy trưởng nhắn "chào" cho bot tối nay → sáng mai 8:00 nhận bản nhắc việc.
 */
async function registerNewChats() {
  const { db } = getAdmin()!;
  const ref = db.doc("settings/integrations");
  const snap = await ref.get();
  const cfg: NotificationConfig = withDefaults(snap.exists ? (snap.data() as NotificationConfig) : null);
  const token = cfg.zalo.botToken;
  if (cfg.zalo.mode !== "bot" || !token) return;
  const ids = splitIds(cfg.zalo.botChatIds);
  const added: string[] = [];
  for (let i = 0; i < 30; i++) {
    const r = await zaloBot(token, "getUpdates", { timeout: 1 }).catch(() => ({ ok: false }) as { ok?: boolean; result?: unknown });
    const list = (Array.isArray(r.result) ? r.result : r.result ? [r.result] : []) as { message?: { chat?: { id?: string }; from?: { display_name?: string } } }[];
    if (!r.ok || !list.length) break;
    for (const u of list) {
      const id = u.message?.chat?.id;
      if (!id || ids.includes(id)) continue;
      ids.push(id);
      added.push(id);
      await zaloBot(token, "sendMessage", { chat_id: id, text: `Đã đăng ký nhận nhắc việc Task Tracker Pro cho ${u.message?.from?.display_name ?? "anh/chị"}. Bot gửi nhắc 8:00 sáng mỗi ngày và báo cáo 20:00 Chủ nhật.` });
    }
  }
  if (added.length) {
    await ref.set({ zalo: { ...cfg.zalo, botChatIds: ids.join(", ") } }, { merge: true });
    console.log(`Thêm ${added.length} người nhận Zalo mới`);
  }
}

const kind = process.argv[2];
if (kind !== "daily" && kind !== "weekly" && kind !== "register") throw new Error("Dùng: daily | weekly | register");

await registerNewChats();
if (kind !== "register") {
  const r = await runJob(kind);
  console.log(JSON.stringify({ ...r, preview: undefined }, null, 2));
  console.log(r.preview);
  const failed = r.results.filter((x) => !x.ok);
  if (failed.length) {
    console.error("Gửi lỗi:", failed);
    process.exitCode = 1;
  }
}
