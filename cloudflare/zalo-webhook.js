/**
 * Máy chủ nhận tin Zalo (Cloudflare Workers, miễn phí 100.000 lượt/ngày).
 * Zalo đẩy tin tới đây ngay khi có người nhắn bot → báo "Đã nhận" → nhờ GitHub xử lý tin đó (tạo việc, gắn ảnh,
 * liên kết tài khoản, trả lời bằng AI) trong khoảng 1 phút.
 * Ví dụ: chỉ huy trưởng nhắn "Phố Nối đang trễ gì?" → vài giây sau bot báo đã nhận, khoảng 1 phút sau có câu trả lời.
 *
 * Biến bí mật cần đặt trong Cloudflare (Settings > Variables and Secrets), KHÔNG ghi vào mã:
 *   ZALO_BOT_TOKEN  Bot Token Zalo (giống ô ở Cài đặt của app)
 *   GITHUB_TOKEN    mã GitHub chỉ có quyền "Actions: Read and write" trên repo task-tracker-pro
 *
 * Lịch gửi bản tin (Settings > Trigger events > Cron: "*\/15 * * * *", 15 phút một lần, giờ UTC):
 *   01:00 UTC = 8:00 VN nhắc việc sáng; 09:00 UTC thứ 2-7 = 16:00 VN việc hạn hôm nay chưa xong;
 *   13:00 UTC Chủ nhật = 20:00 VN báo cáo tuần; các lần còn lại chỉ nhắc giờ hẹn.
 * Cloudflare gọi đúng phút, thay cho lịch của GitHub vốn trễ nhiều giờ.
 */
const REPO = "xaydungvnttc-cpu/task-tracker-pro";

async function webhookSecret(botToken) {
  // Phải khớp với setWebhook trong scripts/cron-runner.ts: HMAC-SHA256(Bot Token, "ttc-webhook"), dạng hex
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(botToken), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("ttc-webhook"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function dispatch(env, inputs) {
  return fetch(`https://api.github.com/repos/${REPO}/actions/workflows/nhac-viec.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "ttc-zalo-webhook", "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs }),
  });
}

/** Lần chạy 15 phút này gửi bản tin nào (giờ UTC) */
function kindAt(date) {
  const h = date.getUTCHours();
  const first = date.getUTCMinutes() < 15;
  const dow = date.getUTCDay(); // 0 = Chủ nhật
  if (first && h === 1) return "daily";
  if (first && h === 9 && dow !== 0) return "afternoon";
  if (first && h === 13 && dow === 0) return "weekly";
  return "inbox";
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatch(env, { kind: kindAt(new Date(event.scheduledTime)) }));
  },

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
        const res = await dispatch(env, { kind: "inbox", update: JSON.stringify(update) });
        await zalo("sendMessage", {
          chat_id: chatId,
          text: res.ok ? "⏳ Đã nhận, bot đang xử lý, khoảng 1 phút nữa có trả lời." : `Bot chưa xử lý được (lỗi ${res.status}). Báo quản trị app kiểm tra máy chủ nhận tin.`,
        });
      })(),
    );
    return new Response("ok");
  },
};
