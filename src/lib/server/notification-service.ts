import "server-only";
import type { ChannelKey, NotificationConfig, OutgoingMessage, WebhookType } from "../types";

/**
 * NotificationService: nhận một OutgoingMessage trung lập, mỗi kênh tự định dạng và gửi.
 * Thêm kênh mới = thêm một hàm gửi + một dòng trong sendAll.
 *
 * Ví dụ: cron 8:00 tạo message "Nhắc việc", sendAll gửi cùng lúc tới nhóm Telegram,
 * webhook Zalo và email Ban giám đốc; kênh nào lỗi thì kênh khác vẫn đi.
 */

export interface SendResult {
  channel: string;
  ok: boolean;
  error?: string;
}

const TONE_ICON = { red: "🔴", yellow: "🟡", green: "🟢", gray: "⚪" } as const;
const MAX_LINES = 15;

function toText(m: OutgoingMessage): string {
  const parts = [m.title];
  for (const s of m.sections) {
    if (s.heading) parts.push("", `${s.tone ? TONE_ICON[s.tone] + " " : ""}${s.heading}`);
    else parts.push("");
    const lines = s.lines.slice(0, MAX_LINES).map((l) => `• ${l}`);
    if (s.lines.length > MAX_LINES) lines.push(`… và ${s.lines.length - MAX_LINES} việc khác`);
    parts.push(...(lines.length ? lines : s.heading ? ["• (không có)"] : []));
  }
  if (m.url) parts.push("", `👉 ${m.url}`);
  return parts.join("\n");
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function toTelegramHtml(m: OutgoingMessage): string {
  return escHtml(toText(m)).replace(escHtml(m.title), `<b>${escHtml(m.title)}</b>`);
}

function toEmailHtml(m: OutgoingMessage): string {
  const color = { red: "#dc2626", yellow: "#d97706", green: "#059669", gray: "#64748b" };
  const sections = m.sections
    .map(
      (s) => `
      ${s.heading ? `<h3 style="margin:20px 0 8px;font-size:15px;color:${color[s.tone ?? "gray"]}">${escHtml(s.heading)}</h3>` : ""}
      <ul style="margin:0;padding-left:18px;color:#0f172a;font-size:14px;line-height:1.6">
        ${s.lines.length ? s.lines.map((l) => `<li>${escHtml(l)}</li>`).join("") : '<li style="color:#94a3b8">Không có</li>'}
      </ul>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0">
    <div style="background:#2554e8;color:#fff;padding:18px 24px;font-size:18px;font-weight:700">${escHtml(m.title)}</div>
    <div style="padding:8px 24px 24px">${sections}
      ${m.url ? `<p style="margin-top:24px"><a href="${m.url}" style="background:#2554e8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Mở Task Tracker Pro</a></p>` : ""}
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px">Gửi tự động từ Task Tracker Pro</p>
</body></html>`;
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  return text;
}

/** Zalo Bot (bot-api.zaloplatforms.com): gửi tới từng người đã nhắn cho bot (chat_id) */
export const ZALO_BOT_API = "https://bot-api.zaloplatforms.com/bot";
export const splitIds = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

async function sendZalo(c: NotificationConfig["zalo"], m: OutgoingMessage) {
  const text = toText(m).slice(0, 1900); // Zalo giới hạn 2000 ký tự
  if (c.mode === "bot") {
    const ids = splitIds(c.botChatIds);
    if (!c.botToken) throw new Error("Thiếu Bot Token");
    if (!ids.length) throw new Error("Chưa có ai nhắn cho bot. Mở Zalo, nhắn một tin cho bot rồi chạy lại");
    for (const chatId of ids) {
      const res = JSON.parse(await post(`${ZALO_BOT_API}${c.botToken}/sendMessage`, { chat_id: chatId, text }));
      if (!res.ok) throw new Error(`Zalo Bot: ${res.description ?? res.message ?? JSON.stringify(res).slice(0, 150)}`);
    }
    return;
  }
  if (c.mode === "webhook") {
    if (!c.webhookUrl) throw new Error("Thiếu Webhook URL");
    await post(c.webhookUrl, { title: m.title, text, url: m.url });
    return;
  }
  if (!c.oaAccessToken || !c.oaUserIds) throw new Error("Thiếu OA Access Token hoặc danh sách user_id");
  for (const userId of c.oaUserIds.split(",").map((s) => s.trim()).filter(Boolean)) {
    const res = JSON.parse(await post("https://openapi.zalo.me/v3.0/oa/message/cs", { recipient: { user_id: userId }, message: { text } }, { access_token: c.oaAccessToken }));
    if (res.error && res.error !== 0) throw new Error(`Zalo OA: ${res.message ?? res.error}`);
  }
}

async function sendTelegram(c: NotificationConfig["telegram"], m: OutgoingMessage) {
  if (!c.botToken || !c.chatId) throw new Error("Thiếu Bot Token hoặc Chat ID");
  await post(`https://api.telegram.org/bot${c.botToken}/sendMessage`, {
    chat_id: c.chatId,
    text: toTelegramHtml(m).slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

async function sendEmail(c: NotificationConfig["email"], m: OutgoingMessage) {
  const to = c.to.split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length || !c.from) throw new Error("Thiếu người gửi (From) hoặc người nhận (To)");
  const html = toEmailHtml(m);
  if (c.provider === "resend") {
    if (!c.resendApiKey) throw new Error("Thiếu Resend API key");
    await post("https://api.resend.com/emails", { from: c.from, to, subject: m.title, html, text: toText(m) }, { Authorization: `Bearer ${c.resendApiKey}` });
    return;
  }
  if (!c.smtpHost) throw new Error("Thiếu SMTP host");
  const nodemailer = await import("nodemailer");
  const port = Number(c.smtpPort) || 587;
  const transport = nodemailer.createTransport({ host: c.smtpHost, port, secure: port === 465, auth: c.smtpUser ? { user: c.smtpUser, pass: c.smtpPass } : undefined });
  await transport.sendMail({ from: c.from, to, subject: m.title, html, text: toText(m) });
}

async function sendWebhook(type: WebhookType, url: string, m: OutgoingMessage) {
  const text = toText(m);
  const body =
    type === "lark"
      ? { msg_type: "text", content: { text } }
      : type === "slack"
        ? { text }
        : type === "discord"
          ? { content: text.slice(0, 1990) }
          : { title: m.title, text, url: m.url, sections: m.sections };
  await post(url, body);
}

async function attempt(channel: string, fn: () => Promise<void>): Promise<SendResult> {
  try {
    await fn();
    return { channel, ok: true };
  } catch (e) {
    return { channel, ok: false, error: (e as Error).message };
  }
}

/** Gửi tới mọi kênh đang bật (hoặc chỉ một kênh khi bấm "Gửi thử") */
export async function sendAll(config: NotificationConfig, m: OutgoingMessage, only?: ChannelKey): Promise<SendResult[]> {
  const jobs: Promise<SendResult>[] = [];
  const want = (k: ChannelKey, enabled: boolean) => (only ? only === k : enabled);
  if (want("zalo", config.zalo.enabled)) jobs.push(attempt("Zalo", () => sendZalo(config.zalo, m)));
  if (want("telegram", config.telegram.enabled)) jobs.push(attempt("Telegram", () => sendTelegram(config.telegram, m)));
  if (want("email", config.email.enabled)) jobs.push(attempt("Email", () => sendEmail(config.email, m)));
  if (!only || only === "webhooks")
    for (const w of config.webhooks.filter((w) => w.url && (only || w.enabled))) jobs.push(attempt(`Webhook ${w.type}`, () => sendWebhook(w.type, w.url, m)));
  return Promise.all(jobs);
}

export const previewText = toText;
