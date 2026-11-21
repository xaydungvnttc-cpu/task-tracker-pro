"use client";

import { useApp } from "@/components/app-provider";
import { DragBoard } from "@/components/drag-board";
import { PageHeader } from "@/components/ui";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { can } from "@/lib/rbac";
import type { TaskStatus } from "@/lib/types";

export default function KanbanPage() {
  const { scoped, me, setStatus } = useApp();
  // Cột Hoàn thành chỉ hiện việc xong trong 30 ngày gần nhất để bảng gọn
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const columns = STATUS_ORDER.map((s) => {
    const tasks = scoped
      .filter((t) => t.status === s && (s !== "done" || (t.completedAt ?? "") >= since))
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    return {
      id: s,
      className: "border-line bg-muted/60",
      tasks,
      header: (
        <div className="flex items-center gap-2 px-3 pt-3 pb-1 text-sm font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} /> {STATUS_LABEL[s]}
          <span className="ml-auto rounded-full bg-surface px-2 text-xs text-ink-soft">{tasks.length}</span>
        </div>
      ),
    };
  });

  return (
    <>
      <PageHeader title="Bảng Kanban" desc="Kéo thẻ sang cột khác để đổi trạng thái. Trên điện thoại: giữ thẻ một nhịp rồi kéo." />
      <DragBoard
        columns={columns}
        canDrag={(t) => !!me && can.updateProgress(me, t)}
        onMove={(t, col) => setStatus(t, col as TaskStatus)}
        layoutClass="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 thin-scroll sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible [&>*]:w-[82vw] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-80 lg:[&>*]:w-auto"
        bodyClass="max-h-[calc(100dvh-13rem)]"
      />
    </>
  );
}
