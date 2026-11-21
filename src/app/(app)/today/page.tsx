"use client";

import { AlertTriangle } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { TaskCard } from "@/components/task-card";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { RULES, watchList } from "@/lib/reminders";
import { isOverdue, isTodayTask } from "@/lib/tasks";
import type { Task } from "@/lib/types";

/** Quá hạn lên đầu, rồi đến chưa xong theo hạn, việc đã xong hôm nay xuống cuối */
const order = (today: string) => (a: Task, b: Task) => {
  const rank = (t: Task) => (t.status === "done" ? 2 : isOverdue(t, today) ? 0 : 1);
  return rank(a) - rank(b) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || Number(b.urgent) - Number(a.urgent);
};

export default function TodayPage() {
  const { scoped, tasks, me, today } = useApp();
  const mine = tasks.filter((t) => t.assigneeId === me!.id && isTodayTask(t, today)).sort(order(today));
  const team = scoped.filter((t) => t.assigneeId !== me!.id && isTodayTask(t, today)).sort(order(today));
  const overdueMine = mine.filter((t) => isOverdue(t, today)).length;
  const weekday = new Date().toLocaleDateString("vi-VN", { weekday: "long" });

  return (
    <>
      <PageHeader title="Việc hôm nay" desc={`${weekday[0].toUpperCase() + weekday.slice(1)}, ${formatDate(today, true)}`} />
      {overdueMine > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={18} /> Bạn có {overdueMine} việc quá hạn cần xử lý ngay.
        </div>
      )}
      {can.viewReports(me!) && <WatchPanel tasks={scoped} today={today} />}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Việc của tôi hôm nay" tasks={mine} empty="Hôm nay bạn không có việc nào. Tuyệt!" />
        <Section title="Việc hôm nay của cả nhóm" tasks={team} empty="Nhóm không có việc nào trong hôm nay." />
      </div>
    </>
  );
}

function Section({ title, tasks, empty }: { title: string; tasks: Task[]; empty: string }) {
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <Card>
      <CardTitle action={<span className="text-xs text-ink-soft">{done}/{tasks.length} xong</span>}>{title}</CardTitle>
      <div className="space-y-2 p-3">
        {tasks.length === 0 ? <EmptyState text={empty} /> : tasks.map((t) => <TaskCard key={t.id} task={t} />)}
      </div>
    </Card>
  );
}

/**
 * Việc dễ bị sót, dành cho quản lý và Ban TGĐ. Ví dụ: "Chưa có người nhận (2)" bấm mở ra danh sách để giao ngay.
 * Cùng quy tắc với bản nhắc Zalo 8:00 sáng (src/lib/reminders.ts).
 */
function WatchPanel({ tasks, today }: { tasks: Task[]; today: string }) {
  const w = watchList(tasks, today);
  const groups = [
    { title: `Trễ từ ${RULES.escalateOwner} ngày, cần Ban TGĐ chỉ đạo`, list: w.escalateOwner, tone: "text-red-600" },
    { title: `Trễ ${RULES.escalateManager}–${RULES.escalateOwner - 1} ngày, quản lý phòng đôn đốc`, list: w.escalateManager, tone: "text-amber-600" },
    { title: "Chưa có người nhận", list: w.unassigned, tone: "text-amber-600" },
    { title: `Đang làm nhưng ${RULES.staleDays} ngày chưa cập nhật`, list: w.stale, tone: "text-ink-soft" },
  ].filter((g) => g.list.length);
  if (!groups.length) return null;
  return (
    <Card className="mb-5">
      <CardTitle>Cần chú ý để không sót việc</CardTitle>
      <div className="divide-y divide-line">
        {groups.map((g) => (
          <details key={g.title} className="group px-4 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              <span className={g.tone}>{g.title}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{g.list.length}</span>
            </summary>
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {g.list.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}
