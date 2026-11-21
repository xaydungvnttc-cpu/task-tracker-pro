"use client";

import clsx from "clsx";
import { CheckCircle2, Circle, ListChecks, PlayCircle, Repeat } from "lucide-react";
import { useApp } from "./app-provider";
import { Avatar, DueBadge, PriorityBadges, ProgressBar, StatusBadge } from "./ui";
import { STATUS_LABEL } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { isOverdue, progressOf } from "@/lib/tasks";
import type { Task, TaskStatus } from "@/lib/types";

/** Bấm 1 chạm: Chưa làm/Tạm dừng → Đang làm → Hoàn thành */
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: "in_progress", on_hold: "in_progress", in_progress: "done", done: "todo" };

export function QuickStatusButton({ task }: { task: Task }) {
  const { me, setStatus } = useApp();
  const next = NEXT_STATUS[task.status];
  const allowed = !!me && can.updateProgress(me, task);
  const Icon = task.status === "done" ? CheckCircle2 : task.status === "in_progress" ? Circle : PlayCircle;
  return (
    <button
      type="button"
      disabled={!allowed}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setStatus(task, next);
      }}
      title={allowed ? `Chuyển sang ${STATUS_LABEL[next]}` : "Bạn không được cập nhật việc này"}
      className={clsx(
        "shrink-0 rounded-full p-0.5 transition disabled:opacity-40",
        task.status === "done" ? "text-emerald-500" : task.status === "in_progress" ? "text-blue-500 hover:text-emerald-500" : "text-ink-soft hover:text-blue-500",
      )}
    >
      <Icon size={22} />
    </button>
  );
}

/** Thẻ task dùng chung cho Hôm nay, Kanban, Eisenhower, Danh sách */
export function TaskCard({ task, compact, showStatus = true }: { task: Task; compact?: boolean; showStatus?: boolean }) {
  const { openTask, userById, today } = useApp();
  const pct = progressOf(task);
  const overdue = isOverdue(task, today);
  return (
    <div
      onClick={() => openTask(task.id)}
      className={clsx(
        "group cursor-pointer rounded-lg border bg-surface p-3 shadow-sm transition hover:shadow-md",
        overdue ? "border-red-300 border-l-4 border-l-red-500 dark:border-red-900" : "border-line",
        task.status === "done" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2">
        <QuickStatusButton task={task} />
        <div className="min-w-0 flex-1">
          <div className={clsx("text-sm font-medium leading-snug text-ink", task.status === "done" && "line-through")}>{task.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PriorityBadges task={task} />
            {showStatus && <StatusBadge status={task.status} />}
            {task.recurrence && <Repeat size={12} className="text-ink-soft" aria-label="Việc định kỳ" />}
          </div>
        </div>
        <Avatar user={userById(task.assigneeId)} size={26} />
      </div>
      {!compact && task.checklist.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <ListChecks size={13} className="text-ink-soft" />
          <ProgressBar value={pct} tone={pct === 100 ? "green" : "brand"} />
          <span className="text-[11px] text-ink-soft">{pct}%</span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-soft">
        <span className="truncate">{task.department}</span>
        <DueBadge task={task} today={today} />
      </div>
    </div>
  );
}
