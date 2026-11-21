import "server-only";
import { NextResponse } from "next/server";
import { cronAllowed } from "./guard";
import { runJob } from "./jobs";

/** API cron trên Vercel: kiểm quyền rồi chạy việc theo lịch */
export async function runCron(req: Request, kind: "daily" | "weekly") {
  if (!(await cronAllowed(req))) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  return NextResponse.json(await runJob(kind, body.config));
}
