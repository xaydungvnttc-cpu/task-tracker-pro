"use client";

import { useApp } from "@/components/app-provider";
import { DragBoard } from "@/components/drag-board";
import { PageHeader } from "@/components/ui";
import { QUADRANTS } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { quadrantOf } from "@/lib/tasks";

export default function MatrixPage() {
  const { scoped, me, setPriority } = useApp();
  const open = scoped.filter((t) => t.status !== "done");
  const columns = QUADRANTS.map((q, i) => {
    const tasks = open.filter((t) => quadrantOf(t) === q.id).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    return {
      id: q.id,
      className: q.tone,
      tasks,
      header: (
        <div className="flex items-start gap-2 px-3 pt-3 pb-1">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-bold shadow-sm">{i + 1}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{q.title}</div>
            <div className="text-[11px] text-ink-soft">{q.hint}</div>
          </div>
          <span className="ml-auto rounded-full bg-surface px-2 text-xs text-ink-soft">{tasks.length}</span>
        </div>
      ),
    };
  });

  return (
    <>
      <PageHeader title="Ma trận ưu tiên" desc="Việc tự xếp vào 4 ô theo cờ Quan trọng và Khẩn cấp. Kéo sang ô khác để đổi độ ưu tiên." />
      <DragBoard
        columns={columns}
        canDrag={(t) => !!me && can.editTask(me, t)}
        onMove={(t, col) => {
          const q = QUADRANTS.find((x) => x.id === col)!;
          setPriority(t, q.important, q.urgent);
        }}
        layoutClass="grid gap-3 md:grid-cols-2"
        bodyClass="max-h-[60vh] md:max-h-[calc(50dvh-6rem)] md:min-h-48"
      />
    </>
  );
}
