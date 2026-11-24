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
import { taskCode } from "../src/lib/tasks";
import { visibleProjects, visibleTasks } from "../src/lib/projects";
import { aiAnswer } from "../src/lib/server/ai-assistant";
import { SAMPLE_PREFIX, buildOwnerSample } from "../src/lib/seed";
import type { NotificationConfig, Project, Task, User } from "../src/lib/types";

// Cách 1 (mặc định): GitHub đăng nhập Google không cần khóa (Workload Identity), chỉ cần mã dự án.
// Cách 2: dán nội dung file khóa .json vào secret FIREBASE_SERVICE_ACCOUNT.
const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (sa) {
  const key = JSON.parse(sa) as { project_id: string; client_email: string; private_key: string };
  process.env.FIREBASE_ADMIN_PROJECT_ID = key.project_id;
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = key.client_email;
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = key.private_key;
} else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("Chưa đăng nhập Google: cần bước Workload Identity hoặc secret FIREBASE_SERVICE_ACCOUNT");
}

async function zaloBot(token: string, method: string, body: unknown, waitMs = 15_000) {
  const res = await fetch(`${ZALO_BOT_API}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(waitMs),
  });
  return (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown };
}

type ZaloUpdate = {
  event_name?: string;
  message?: { message_id?: string; text?: string; photo?: string; photo_url?: string; caption?: string; chat?: { id?: string }; from?: { display_name?: string; name?: string } };
};

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
  if (cfg.zalo.mode !== "bot" || !token) {
    console.log(`Đọc tin Zalo: bỏ qua (kiểu Zalo = ${cfg.zalo.mode}, ${token ? "có" : "chưa có"} Bot Token)`);
    return;
  }
  const companyIds = splitIds(cfg.zalo.botChatIds);
  const before = companyIds.join(",");
  const saveIds = async () => {
    await ref.set({ zalo: { ...cfg.zalo, botChatIds: companyIds.join(", ") } }, { merge: true });
    console.log("Cập nhật người nhận bản tổng hợp Zalo");
  };
  let projects: Project[] | null = null;
  let users: User[] | null = null;
  const loadUsers = async () => (users ??= (await db.collection("users").get()).docs.map((d) => ({ ...(d.data() as User), id: d.id })));
  const ownerId = ((await db.doc("meta/owner").get()).data()?.uid as string | undefined) ?? "";
  const today = serverToday();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const send = (chat_id: string, text: string) => zaloBot(token, "sendMessage", { chat_id, text });

  /**
   * Ví dụ: chỉ huy trưởng chụp ảnh sàn tầng 6 đã đổ bê tông, gửi bot kèm chú thích "#K7Q2M"
   * → ảnh thành link kết quả của việc K7Q2M. Không ghi mã mà chỉ có 1 việc đang làm thì gắn vào việc đó.
   */
  const attachPhoto = async (chatId: string, url: string, caption: string, linked: User | undefined) => {
    if (!linked) {
      await send(chatId, 'Bot chưa biết anh/chị là ai nên chưa gắn được ảnh. Mở app, vào Cài đặt > Hồ sơ của tôi lấy mã rồi nhắn bot, ví dụ "LK AB12CD".');
      return;
    }
    const open = (await db.collection("tasks").where("status", "!=", "done").get()).docs.map((d) => ({ ...(d.data() as Task), id: d.id }));
    const code = caption.match(/#([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase();
    const mine = open.filter((t) => t.assigneeId === linked.id);
    const task = code ? open.find((t) => taskCode(t.id) === code) : mine.length === 1 ? mine[0] : undefined;
    if (!task) {
      const list = mine.slice(0, 6).map((t) => `#${taskCode(t.id)} ${t.title}`).join("\n");
      await send(chatId, `${code ? `Không thấy việc mã ${code}. ` : ""}Gửi lại ảnh kèm chú thích là mã việc, ví dụ "#${mine[0] ? taskCode(mine[0].id) : "K7Q2M"}".${list ? `\nViệc của anh/chị:\n${list}` : ""}`);
      return;
    }
    const nowIso = new Date().toISOString();
    const note = caption.replace(/#[0-9A-Z]{5}\b/i, "").trim();
    const label = `Ảnh Zalo ${formatDate(today)} · ${linked.name}${note ? ` · ${note}` : ""}`;
    await db.doc(`tasks/${task.id}`).set({ outputLinks: [...(task.outputLinks ?? []), { label, url }], updatedAt: nowIso }, { merge: true });
    const notify = Array.from(new Set([task.assigneeId, ...(task.watcherIds ?? [])].filter((x): x is string => !!x && x !== linked.id)));
    for (const userId of notify)
      await db.collection("notifications").add({ userId, title: "Ảnh hiện trường mới", body: `${linked.name}: ${task.title}`, taskId: task.id, read: false, createdAt: nowIso });
    await send(chatId, `Đã gắn ảnh vào việc: ${task.title}. Mở app bấm Hoàn thành khi đủ hồ sơ. ${appUrl}/tasks`);
    console.log(`Gắn ảnh Zalo vào việc ${task.id}`);
  };

  const handle = async (u: ZaloUpdate) => {
    const m = u.message;
    const chatId = m?.chat?.id;
    if (!chatId) return;
    const sender = m?.from?.display_name ?? m?.from?.name ?? "anh/chị";
    const text = (m?.text ?? "").trim();
    const all = await loadUsers();
    const linked = all.find((x) => x.zaloChatId === chatId);

    // Liên kết tài khoản
    const lk = text.match(LINK);
    if (lk) {
      const user = all.find((x) => x.id.slice(0, 6).toUpperCase() === lk[1].toUpperCase());
      if (!user) {
        await send(chatId, "Mã liên kết không đúng. Mở app, vào Cài đặt > Hồ sơ của tôi để xem mã.");
        return;
      }
      await db.doc(`users/${user.id}`).set({ zaloChatId: chatId }, { merge: true });
      user.zaloChatId = chatId;
      const boss = user.role === "owner" || user.department === "Ban Tổng Giám đốc";
      if (boss && !companyIds.includes(chatId)) {
        companyIds.push(chatId);
        await saveIds(); // lưu ngay, không đợi hết lượt (lượt có thể bị dừng giữa chừng)
      }
      await send(chatId, `Đã liên kết Zalo với tài khoản ${user.name}. Bot nhắc riêng việc của anh/chị lúc 8:00 sáng${boss ? ", kèm bản tổng hợp toàn công ty" : ""}. Muốn giao việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:". Ảnh hiện trường gửi kèm mã việc (ví dụ #K7Q2M, xem trong app) sẽ thành link kết quả.`);
      return;
    }

    // Ảnh hiện trường → link kết quả của việc
    const photo = m?.photo ?? m?.photo_url;
    if (photo) {
      await attachPhoto(chatId, photo, (m?.caption ?? text).trim(), linked);
      return;
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
      await send(chatId, `Chào ${sender}. Để nhận nhắc việc riêng, mở app TTC Điều Hành, vào Cài đặt > Hồ sơ của tôi, lấy mã rồi nhắn cho bot, ví dụ "LK AB12CD". Muốn báo việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
    } else if (text && linked && cfg.ai.geminiKey) {
      // Hỏi đáp AI, chỉ trên dữ liệu người hỏi được xem. Ví dụ "Phố Nối đang trễ gì?"
      const allTasks = (await db.collection("tasks").get()).docs.map((d) => ({ ...(d.data() as Task), id: d.id }));
      projects ??= (await db.collection("projects").get()).docs.map((d) => ({ ...(d.data() as Project), id: d.id }));
      const vp = visibleProjects(projects, linked);
      const answer = await aiAnswer(text, linked, visibleTasks(allTasks, projects, linked), all, vp, today, cfg.ai.geminiKey).catch((e) => {
        console.log("Lỗi trợ lý AI:", String(e).slice(0, 200));
        return null;
      });
      await send(chatId, answer ?? `Trợ lý AI đang bận, anh/chị hỏi lại sau ít phút. Muốn tạo việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
      console.log("Trợ lý AI đã trả lời 1 câu hỏi");
    } else if (text) {
      await send(chatId, `Tin này chưa thành việc. Muốn tạo việc, nhắn bắt đầu bằng "Việc:" hoặc "Gấp:".`);
    }
  };

  // Có máy chủ nhận tin (Cloudflare) thì GitHub nhận đúng tin đó qua biến ZALO_UPDATE, xử lý ngay, không cần chờ lịch
  if (process.env.ZALO_UPDATE) {
    await handle(JSON.parse(process.env.ZALO_UPDATE) as ZaloUpdate);
    console.log("Đã xử lý 1 tin Zalo từ máy chủ nhận tin");
  }

  if (process.env.LISTEN_SECONDS && process.env.LISTEN_SECONDS !== "0") {
    const me = (await zaloBot(token, "getMe", {}).catch(() => ({}))) as { result?: { account_name?: string; display_name?: string } };
    const wh = (await zaloBot(token, "getWebhookInfo", {}).catch(() => ({}))) as { result?: { url?: string } };
    console.log(`Bot: ${me.result?.display_name ?? me.result?.account_name ?? "?"}; webhook: ${wh.result?.url ? "ĐANG BẬT (getUpdates sẽ không nhận tin)" : "không"}`);
  }
  // Chạy tay có thể "nghe" lâu hơn (biến LISTEN_SECONDS) để thử bot: nhắn lúc nào trong khoảng đó cũng được trả lời ngay
  const until = Date.now() + Number(process.env.LISTEN_SECONDS || 0) * 1000;
  for (let i = 0; i < (process.env.ZALO_UPDATE ? 0 : 500); i++) {
    const r = await zaloBot(token, "getUpdates", { timeout: "20" }, 40_000).catch((e) => ({ ok: false, description: String(e) }) as { ok?: boolean; result?: unknown });
    const list = (Array.isArray(r.result) ? r.result : r.result ? [r.result] : []) as ZaloUpdate[];
    // Zalo trả 408 "Request timeout" khi không có tin mới, đó không phải lỗi
    const empty = (r as { error_code?: number }).error_code === 408;
    // Đã bật máy chủ nhận tin (webhook) thì tin tự đẩy tới, không cần đọc
    if (!r.ok && /webhook/i.test(String((r as { description?: string }).description))) {
      console.log("Đọc tin Zalo: tin đi qua máy chủ nhận tin, không cần đọc");
      break;
    }
    // Không bao giờ huỷ ngang một lần chờ tin: Zalo có thể đã giao tin cho kết nối bị huỷ và tin đó mất luôn
    if (i === 0 || list.length || (!r.ok && !empty)) console.log(`Đọc tin Zalo: ${r.ok ? `${list.length} tin mới` : empty ? "không có tin mới" : "lỗi " + JSON.stringify(r).slice(0, 200)}`);
    if (!r.ok || !list.length) {
      if (Date.now() < until) continue;
      break;
    }
    for (const u of list) await handle(u);
  }
  // Ban TGĐ đã liên kết Zalo luôn có tên trong danh sách nhận bản tổng hợp công ty
  for (const u of await loadUsers())
    if (u.zaloChatId && (u.role === "owner" || u.department === "Ban Tổng Giám đốc") && !companyIds.includes(u.zaloChatId)) companyIds.push(u.zaloChatId);
  if (companyIds.join(",") !== before) await saveIds();
}

/**
 * Nhắc giờ hẹn trước khoảng 1 giờ (chạy cùng lượt đọc tin 15 phút một lần).
 * Ví dụ việc "Mời TVGS nghiệm thu cốt thép sàn 6" hẹn 09:00 → khoảng 8:00 người làm nhận tin Zalo và chuông trong app.
 */
async function remindAppointments() {
  const { db } = getAdmin()!;
  const cfg: NotificationConfig = withDefaults(((await db.doc("settings/integrations").get()).data() as NotificationConfig) ?? null);
  const today = serverToday();
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const now = toMin(hm);
  const snap = await db.collection("tasks").where("dueDate", "==", today).get();
  const due = snap.docs
    .map((d) => ({ ...(d.data() as Task), id: d.id }))
    .filter((t) => t.status !== "done" && t.dueTime && t.timeReminded !== `${today} ${t.dueTime}`)
    .filter((t) => {
      const left = toMin(t.dueTime!) - now;
      return left >= 0 && left <= 75;
    });
  if (!due.length) return;
  const users = (await db.collection("users").get()).docs.map((d) => ({ ...(d.data() as User), id: d.id }));
  const nowIso = new Date().toISOString();
  for (const t of due) {
    const u = users.find((x) => x.id === t.assigneeId);
    const text = `⏰ ${t.dueTime} hôm nay: ${t.title}${u ? ` (${u.name})` : ""}. Xem tại ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/tasks`;
    if (u?.zaloChatId && cfg.zalo.mode === "bot" && cfg.zalo.botToken) await zaloBot(cfg.zalo.botToken, "sendMessage", { chat_id: u.zaloChatId, text }).catch(() => null);
    if (u) await db.collection("notifications").add({ userId: u.id, title: `Sắp đến giờ hẹn ${t.dueTime}`, body: t.title, taskId: t.id, read: false, createdAt: nowIso });
    await db.doc(`tasks/${t.id}`).set({ timeReminded: `${today} ${t.dueTime}` }, { merge: true });
    console.log(`Nhắc giờ hẹn: ${t.id}`);
  }
}

/**
 * Bật/tắt máy chủ nhận tin: Zalo đẩy từng tin tới Cloudflare ngay khi có, Cloudflare chuyển sang GitHub xử lý (khoảng 1 phút).
 * Mã bí mật gắn kèm mỗi tin = HMAC(Bot Token, "ttc-webhook"): Cloudflare tự tính lại từ Bot Token để chặn tin giả.
 */
async function setWebhook(url: string) {
  const { db } = getAdmin()!;
  const cfg: NotificationConfig = withDefaults(((await db.doc("settings/integrations").get()).data() as NotificationConfig) ?? null);
  const token = cfg.zalo.botToken;
  if (!token) throw new Error("Chưa có Bot Token Zalo ở Cài đặt");
  const { createHmac } = await import("node:crypto");
  const secret = createHmac("sha256", token).update("ttc-webhook").digest("hex");
  const r = url ? await zaloBot(token, "setWebhook", { url, secret_token: secret }) : await zaloBot(token, "deleteWebhook", {});
  console.log(`${url ? "Bật" : "Tắt"} máy chủ nhận tin:`, JSON.stringify(r).slice(0, 300));
  if (!r.ok) process.exitCode = 1;
}

/**
 * Nạp lại dữ liệu mẫu bằng quyền máy chủ (không cần ai bấm trong app): xóa bản mẫu cũ "mau-…" rồi ghi bộ mẫu mới.
 * Việc, dự án, người thật không bị đụng tới. In số liệu trước và sau để đối chiếu.
 */
async function reseed() {
  const { db } = getAdmin()!;
  const ownerUid = (await db.doc("meta/owner").get()).data()?.uid as string | undefined;
  if (!ownerUid) throw new Error("Chưa có Owner (chưa ai đăng nhập app)");
  const count = async () => {
    const out: Record<string, string> = {};
    for (const c of ["users", "projects", "tasks"]) {
      const ids = (await db.collection(c).select().get()).docs.map((d) => d.id);
      out[c] = `${ids.length} (mẫu ${ids.filter((x) => x.startsWith(SAMPLE_PREFIX)).length})`;
    }
    return JSON.stringify(out);
  };
  console.log("Trước khi nạp:", await count());
  const { users, projects, tasks } = buildOwnerSample(ownerUid, serverToday());
  const fresh = new Set([...users, ...projects, ...tasks].map((x) => x.id));
  const writer = db.bulkWriter();
  for (const c of ["users", "projects", "tasks"])
    for (const d of (await db.collection(c).select().get()).docs) if (d.id.startsWith(SAMPLE_PREFIX) && !fresh.has(d.id)) writer.delete(d.ref);
  const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
  for (const u of users) writer.set(db.doc(`users/${u.id}`), clean(u));
  for (const p of projects) writer.set(db.doc(`projects/${p.id}`), clean(p));
  for (const t of tasks) writer.set(db.doc(`tasks/${t.id}`), clean(t));
  await writer.close();
  console.log("Sau khi nạp:", await count());
}

const kind = process.argv[2];
if (!["daily", "weekly", "afternoon", "inbox", "webhook", "seed"].includes(kind)) throw new Error("Dùng: daily | weekly | afternoon | inbox | webhook | seed");
if (kind === "seed") {
  await reseed();
  process.exit();
}
if (kind === "webhook") {
  await setWebhook((process.env.WEBHOOK_URL ?? "").trim());
  process.exit();
}

/**
 * Mỗi bản tin chỉ gửi trong khung giờ của nó (giờ Việt Nam). Lịch chạy bị trễ quá khung thì bỏ qua,
 * tránh chuyện "16:00 còn 10 việc hạn hôm nay" lại tới lúc 4 giờ sáng hôm sau.
 */
function inWindow(k: string): boolean {
  const vn = new Date(Date.now() + 7 * 3600_000);
  const h = vn.getUTCHours() + vn.getUTCMinutes() / 60;
  const dow = vn.getUTCDay(); // 0 = Chủ nhật
  if (k === "daily") return h >= 7 && h < 10;
  if (k === "afternoon") return dow !== 0 && h >= 15.5 && h < 18;
  if (k === "weekly") return (dow === 0 && h >= 19) || (dow === 1 && h < 10);
  return true;
}

await processInbox();
await remindAppointments();
if (kind !== "inbox" && !inWindow(kind) && process.env.FORCE !== "1") {
  console.log(`Bỏ qua bản tin ${kind}: lịch chạy lúc ${new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 16).replace("T", " ")} giờ VN, ngoài khung giờ gửi`);
} else if (kind !== "inbox") {
  const r = await runJob(kind as "daily" | "weekly" | "afternoon");
  console.log(JSON.stringify({ ...r, preview: undefined }, null, 2));
  console.log(r.preview);
  const failed = r.results.filter((x) => !x.ok);
  if (failed.length) {
    console.error("Gửi lỗi:", failed);
    process.exitCode = 1;
  }
}
