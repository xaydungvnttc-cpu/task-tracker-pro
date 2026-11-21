import { buildICS } from "@/lib/ics";
import { appUrl, isProduction, loadData } from "@/lib/server/context";

export const dynamic = "force-dynamic";

/**
 * Link lịch để Google Calendar "Thêm lịch từ URL" (Google tự cập nhật vài giờ một lần).
 * /api/calendar/feed?token=...&user=<id> (user để chỉ lấy việc của một người)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CALENDAR_FEED_TOKEN;
  if ((isProduction() && !secret) || (secret && url.searchParams.get("token") !== secret))
    return new Response("Sai hoặc thiếu token", { status: 401 });
  const { tasks } = await loadData();
  const user = url.searchParams.get("user");
  const list = user ? tasks.filter((t) => t.assigneeId === user || t.watcherIds.includes(user)) : tasks;
  return new Response(buildICS(list, appUrl()), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="task-tracker.ics"', "Cache-Control": "no-store" },
  });
}
