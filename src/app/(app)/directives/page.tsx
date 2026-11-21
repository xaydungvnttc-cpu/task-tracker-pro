"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Button, Card, EmptyState, PageHeader, Segmented, StatusBadge } from "@/components/ui";
import { OFFICE_LABEL } from "@/lib/constants";
import { diffDays, formatDate, formatDateTime } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { isOverdue } from "@/lib/tasks";

type View = "open" | "late" | "done";

/**
 * Sổ chỉ đạo: mọi chỉ đạo của Chủ tịch, Ban TGĐ được ghi thành việc có người nhận, hạn và kết quả báo lại.
 * Ví dụ: họp giao ban sáng thứ Hai TGĐ chỉ đạo "Báo cáo phương án bù tiến độ" → ghi vào đây, giao Chỉ huy trưởng, hạn thứ Tư.
 */
export default function DirectivesPage() {
  const { me, scoped, today, newTask, openTask, userById, projectById } = useApp();
  const [view, setView] = useState<View>("open");
  const all = scoped.filter((t) => t.directive);
  const open = all.filter((t) => t.status !== "done");
  const late = open.filter((t) => isOverdue(t, today));
  const list = (view === "open" ? open : view === "late" ? late : all.filter((t) => t.status === "done")).sort((a, b) =>
    view === "done" ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  );

  return (
    <>
      <PageHeader
        title="Sổ chỉ đạo"
        desc="Chỉ đạo của Chủ tịch, Ban Tổng Giám đốc: ai nhận, hạn khi nào, đã báo kết quả chưa."
        actions={
          can.viewReports(me!) && (
            <Button variant="primary" size="sm" onClick={() => newTask({ directive: true, important: true, urgent: true })}>
              <Plus size={16} /> Ghi chỉ đạo mới
            </Button>
          )
        }
      />
      <div className="mb-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: `Đang thực hiện (${open.length})` },
            { value: "late", label: `Quá hạn (${late.length})` },
            { value: "done", label: `Đã xong (${all.length - open.length})` },
          ]}
        />
      </div>
      <Card>
        {list.length === 0 ? (
          <div className="p-4">
            <EmptyState text={view === "late" ? "Không có chỉ đạo quá hạn" : "Chưa có chỉ đạo nào"} />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {list.map((t) => {
              const p = projectById(t.projectId);
              const od = isOverdue(t, today);
              const last = t.comments[t.comments.length - 1];
              return (
                <button key={t.id} onClick={() => openTask(t.id)} className={clsx("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted", od && "border-l-4 border-l-red-500")}>
                  <Avatar user={userById(t.assigneeId)} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{t.title}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-ink-soft">
                      Giao {userById(t.assigneeId)?.name ?? "(chưa có người nhận)"} · {p ? `${p.code} · ${p.name}` : OFFICE_LABEL} · Ngày giao {formatDate(t.createdAt.slice(0, 10))}
                    </div>
                    {last && (
                      <div className="mt-1 line-clamp-2 rounded bg-muted px-2 py-1 text-xs text-ink">
                        <span className="font-semibold">{userById(last.userId)?.name ?? "Ai đó"}</span> ({formatDateTime(last.createdAt)}): {last.text}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {t.status === "done" ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Xong {t.completedAt ? formatDate(t.completedAt.slice(0, 10)) : ""}</span>
                    ) : t.dueDate ? (
                      <span className={clsx(od ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-soft")}>
                        Hạn {formatDate(t.dueDate)}
                        <br />
                        {od ? `quá ${diffDays(today, t.dueDate)} ngày` : diffDays(t.dueDate, today) === 0 ? "hôm nay" : `còn ${diffDays(t.dueDate, today)} ngày`}
                      </span>
                    ) : (
                      <span className="text-ink-soft">Không hạn</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
