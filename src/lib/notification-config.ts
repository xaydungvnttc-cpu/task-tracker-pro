import type { NotificationConfig } from "./types";

export function defaultConfig(): NotificationConfig {
  return {
    zalo: { enabled: false, mode: "bot", botToken: "", botChatIds: "", webhookUrl: "", oaAccessToken: "", oaUserIds: "" },
    telegram: { enabled: false, botToken: "", chatId: "" },
    email: { enabled: false, provider: "resend", from: "", to: "", resendApiKey: "", smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "" },
    webhooks: [],
    events: { taskAssigned: true, mention: true, statusChange: true, dailyDigest: true, weeklyReport: true },
  };
}

/** Ghép cấu hình đã lưu lên bản mặc định, để bản lưu cũ thiếu trường mới vẫn chạy */
export function withDefaults(c: Partial<NotificationConfig> | null | undefined): NotificationConfig {
  const d = defaultConfig();
  if (!c) return d;
  return {
    zalo: { ...d.zalo, ...c.zalo },
    telegram: { ...d.telegram, ...c.telegram },
    email: { ...d.email, ...c.email },
    webhooks: c.webhooks ?? [],
    events: { ...d.events, ...c.events },
  };
}
