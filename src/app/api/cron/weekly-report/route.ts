import { runCron } from "@/lib/server/cron";

export const dynamic = "force-dynamic";

/** Vercel Cron gọi GET lúc 13:00 UTC Chủ nhật = 20:00 Chủ nhật giờ Việt Nam */
export const GET = (req: Request) => runCron(req, "weekly");
export const POST = (req: Request) => runCron(req, "weekly");
