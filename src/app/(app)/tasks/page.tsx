"use client";

import { Repeat, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { QuickStatusButton } from "@/components/task-card";
import { Avatar, Card, DueBadge, EmptyState, Input, PageHeader, PriorityBadges, ProgressBar, Select, StatusBadge } from "@/components/ui";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { isOverdue, progressOf } from "@/lib/tasks";
import type { TaskStatus } from "@/lib/types";

export default function TasksPage() {
  const { scoped, userById, openTask, today } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TaskStatus | "open" | "">("open");
  const [dept, setDept] = useState("");

  // Mở thẳng một việc từ link trong thông báo / lịch: /tasks?open=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    if (id) openTask(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const depts = Array.from(new Set(scoped.map((t) => t.department))).sort();
  const list = scoped
    .filter((t) => (status === "open" ? t.status !== "done" : !status || t.status === status))
    .filter((t) => !dept || t.department === dept)
    .filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  return (
    <>
      <PageHeader title="Danh sách việc" desc={`${list.length} việc`} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input className="pl-9" placeholder="Tìm theo tên việc..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | "open" | "")}>
          <option value="open">Chưa xong</option>
          <option value="">Mọi trạng thái</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">Mọi phòng ban</option>
          {depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
      </div>
      <Card className="divide-y divide-line">
        {list.length === 0 && (
          <div className="p-4">
            <EmptyState text="Không có việc phù hợp bộ lọc" />
          </div>
        )}
        {list.map((t) => {
          const pct = progressOf(t);
          return (
            <div key={t.id} onClick={() => openTask(t.id)} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted sm:px-4">
              <QuickStatusButton task={t} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {t.title} {t.recurrence && <Repeat size={12} className="shrink-0 text-ink-soft" />}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                  <StatusBadge status={t.status} />
                  <PriorityBadges task={t} />
                  <span className="hidden sm:inline">{t.department}</span>
                </div>
              </div>
              <div className="hidden w-28 md:block">
                <ProgressBar value={pct} tone={pct === 100 ? "green" : "brand"} />
                <div className="mt-0.5 text-right text-[11px] text-ink-soft">{pct}%</div>
              </div>
              <div className="w-24 text-right">
                <DueBadge task={t} today={today} />
              </div>
              <Avatar user={userById(t.assigneeId)} size={28} />
            </div>
          );
        })}
      </Card>
    </>
  );
}
