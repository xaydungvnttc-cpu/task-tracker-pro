import { runCron } from "@/lib/server/cron";

export const dynamic = "force-dynamic";

/** Vercel Cron gọi GET lúc 01:00 UTC = 08:00 giờ Việt Nam (xem vercel.json) */
export const GET = (req: Request) => runCron(req, "daily");
/** Nút "Chạy thử" trong trang Cài đặt */
export const POST = (req: Request) => runCron(req, "daily");
