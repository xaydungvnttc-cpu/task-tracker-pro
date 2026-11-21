import "server-only";
import { todayISO } from "../dates";
import { withDefaults } from "../notification-config";
import { buildSeed } from "../seed";
import { buildNextInstance, shouldSpawn } from "../tasks";
import type { AppNotification, NotificationConfig, Project, Task, User } from "../types";
import { getAdmin } from "./admin";

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
export const serverToday = () => todayISO(process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh");
export const isProduction = () => getAdmin() !== null;

const env = (k: string) => process.env[k] ?? "";

/** Cấu hình từ biến môi trường: kênh nào có token thì tự bật */
function envConfig(): NotificationConfig {
  const c = withDefaults(null);
  if (env("ZALO_BOT_TOKEN") || env("ZALO_WEBHOOK_URL") || env("ZALO_OA_ACCESS_TOKEN"))
    c.zalo = {
      enabled: true,
      mode: env("ZALO_BOT_TOKEN") ? "bot" : env("ZALO_WEBHOOK_URL") ? "webhook" : "oa",
      botToken: env("ZALO_BOT_TOKEN"),
      botChatIds: env("ZALO_BOT_CHAT_IDS"),
      webhookUrl: env("ZALO_WEBHOOK_URL"),
      oaAccessToken: env("ZALO_OA_ACCESS_TOKEN"),
      oaUserIds: env("ZALO_OA_USER_IDS"),
    };
  if (env("TELEGRAM_BOT_TOKEN")) c.telegram = { enabled: true, botToken: env("TELEGRAM_BOT_TOKEN"), chatId: env("TELEGRAM_CHAT_ID") };
  const provider = env("EMAIL_PROVIDER") === "smtp" ? "smtp" : "resend";
  if (env("RESEND_API_KEY") || env("SMTP_HOST"))
    c.email = {
      enabled: true,
      provider,
      from: env("EMAIL_FROM"),
      to: env("EMAIL_TO"),
      resendApiKey: env("RESEND_API_KEY"),
      smtpHost: env("SMTP_HOST"),
      smtpPort: env("SMTP_PORT") || "587",
      smtpUser: env("SMTP_USER"),
      smtpPass: env("SMTP_PASS"),
    };
  const hooks = [
    ["lark", "LARK_WEBHOOK_URL"],
    ["slack", "SLACK_WEBHOOK_URL"],
    ["discord", "DISCORD_WEBHOOK_URL"],
    ["custom", "CUSTOM_WEBHOOK_URL"],
  ] as const;
  c.webhooks = hooks.filter(([, k]) => env(k)).map(([type, k]) => ({ id: `env-${type}`, type, url: env(k), enabled: true }));
  return c;
}

/** Ghép cấu hình: kênh đã bật trong giao diện ưu tiên hơn biến môi trường */
function merge(base: NotificationConfig, ui: NotificationConfig | null): NotificationConfig {
  if (!ui) return base;
  return {
    zalo: ui.zalo.enabled ? ui.zalo : base.zalo,
    telegram: ui.telegram.enabled ? ui.telegram : base.telegram,
    email: ui.email.enabled ? ui.email : base.email,
    webhooks: [...base.webhooks, ...ui.webhooks],
    events: ui.events,
  };
}

/**
 * Production: lấy cấu hình đã lưu trong Firestore (settings/integrations).
 * Demo: dùng cấu hình trình duyệt gửi kèm (vì server không đọc được localStorage).
 */
export async function resolveConfig(clientConfig?: unknown): Promise<NotificationConfig> {
  const admin = getAdmin();
  if (admin) {
    const snap = await admin.db.doc("settings/integrations").get();
    return merge(envConfig(), snap.exists ? withDefaults(snap.data() as NotificationConfig) : null);
  }
  return merge(envConfig(), clientConfig ? withDefaults(clientConfig as NotificationConfig) : null);
}

/** Dữ liệu cho cron và lịch: Firestore khi Production, dữ liệu mẫu khi Demo */
export async function loadData(): Promise<{ tasks: Task[]; users: User[]; projects: Project[] }> {
  const admin = getAdmin();
  if (!admin) {
    const seed = buildSeed(serverToday());
    return { tasks: seed.tasks, users: seed.users, projects: seed.projects };
  }
  const [t, u, p] = await Promise.all([admin.db.collection("tasks").get(), admin.db.collection("users").get(), admin.db.collection("projects").get()]);
  return { tasks: t.docs.map((d) => d.data() as Task), users: u.docs.map((d) => d.data() as User), projects: p.docs.map((d) => d.data() as Project) };
}

/** Cron chạy lưới an toàn: sinh kỳ mới cho việc định kỳ dù không ai mở app */
export async function spawnRecurring(tasks: Task[], today: string): Promise<number> {
  const admin = getAdmin();
  if (!admin) return 0;
  const batch = admin.db.batch();
  let n = 0;
  for (const t of tasks) {
    if (!shouldSpawn(t, today)) continue;
    const next = buildNextInstance(t, today);
    if (!next) continue;
    batch.update(admin.db.doc(`tasks/${t.id}`), { recurrenceSpawned: true });
    batch.set(admin.db.doc(`tasks/${next.id}`), JSON.parse(JSON.stringify(next)));
    tasks.push(next);
    n++;
  }
  if (n) await batch.commit();
  return n;
}

export async function addInAppNotifications(list: AppNotification[]): Promise<void> {
  const admin = getAdmin();
  if (!admin || !list.length) return;
  const batch = admin.db.batch();
  list.forEach((n) => batch.set(admin.db.doc(`notifications/${n.id}`), n));
  await batch.commit();
}

/** Lưu nhận định AI vào settings/aiReport (chỉ Owner đọc được theo firestore.rules) */
export async function saveAiReport(text: string) {
  const admin = getAdmin();
  if (admin) await admin.db.doc("settings/aiReport").set({ text, createdAt: new Date().toISOString() });
}
