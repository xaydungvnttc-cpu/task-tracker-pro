/**
 * Máy chủ nhận tin Zalo (Cloudflare Workers, miễn phí 100.000 lượt/ngày).
 * Zalo đẩy tin tới đây ngay khi có người nhắn bot → báo "Đã nhận" → nhờ GitHub xử lý tin đó (tạo việc, gắn ảnh,
 * liên kết tài khoản, trả lời bằng AI) trong khoảng 1 phút.
 * Ví dụ: chỉ huy trưởng nhắn "Phố Nối đang trễ gì?" → vài giây sau bot báo đã nhận, khoảng 1 phút sau có câu trả lời.
 *
 * Biến bí mật cần đặt trong Cloudflare (Settings > Variables and Secrets), KHÔNG ghi vào mã:
 *   ZALO_BOT_TOKEN  Bot Token Zalo (giống ô ở Cài đặt của app)
 *   GITHUB_TOKEN    mã GitHub chỉ có quyền "Actions: Read and write" trên repo task-tracker-pro
 */
const REPO = "xaydungvnttc-cpu/task-tracker-pro";

async function webhookSecret(botToken) {
  // Phải khớp với setWebhook trong scripts/cron-runner.ts: HMAC-SHA256(Bot Token, "ttc-webhook"), dạng hex
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(botToken), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("ttc-webhook"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env, ctx) {
    if (req.method !== "POST") return new Response("TTC Điều Hành: máy chủ nhận tin Zalo đang chạy.");
    if (req.headers.get("X-Bot-Api-Secret-Token") !== (await webhookSecret(env.ZALO_BOT_TOKEN))) return new Response("Sai mã bí mật", { status: 403 });

    const body = await req.json().catch(() => null);
    const update = body?.result ?? body;
    const chatId = update?.message?.chat?.id;
    if (!chatId) return new Response("ok");

    const zalo = (method, payload) =>
      fetch(`https://bot-api.zaloplatforms.com/bot${env.ZALO_BOT_TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    ctx.waitUntil(
      (async () => {
        const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/nhac-viec.yml/dispatches`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "ttc-zalo-webhook", "Content-Type": "application/json" },
          body: JSON.stringify({ ref: "main", inputs: { kind: "inbox", update: JSON.stringify(update) } }),
        });
        await zalo("sendMessage", {
          chat_id: chatId,
          text: res.ok ? "⏳ Đã nhận, bot đang xử lý, khoảng 1 phút nữa có trả lời." : `Bot chưa xử lý được (lỗi ${res.status}). Báo quản trị app kiểm tra máy chủ nhận tin.`,
        });
      })(),
    );
    return new Response("ok");
  },
};
