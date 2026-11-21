"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { TaskCard } from "./task-card";
import type { Task } from "@/lib/types";

/**
 * Bảng kéo thả dùng chung cho Kanban (cột = trạng thái) và Eisenhower (ô = mức ưu tiên).
 * Chuột: kéo sau 5px. Cảm ứng: giữ 200ms rồi kéo, để vuốt cuộn trang không bị nhầm thành kéo.
 */
export interface BoardColumn {
  id: string;
  header: ReactNode;
  className?: string;
  tasks: Task[];
}

export function DragBoard({
  columns,
  onMove,
  canDrag,
  layoutClass,
  bodyClass,
}: {
  columns: BoardColumn[];
  onMove: (task: Task, columnId: string) => void;
  canDrag: (t: Task) => boolean;
  layoutClass: string;
  bodyClass?: string;
}) {
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const all = columns.flatMap((c) => c.tasks);

  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const task = all.find((t) => t.id === e.active.id);
    const from = columns.find((c) => c.tasks.some((t) => t.id === e.active.id));
    if (task && e.over && from && e.over.id !== from.id) onMove(task, String(e.over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActive(all.find((t) => t.id === e.active.id) ?? null)}
      onDragEnd={onEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className={layoutClass}>
        {columns.map((c) => (
          <Column key={c.id} column={c} canDrag={canDrag} bodyClass={bodyClass} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {active && (
          <div className="rotate-2 scale-105 cursor-grabbing shadow-2xl">
            <TaskCard task={active} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ column, canDrag, bodyClass }: { column: BoardColumn; canDrag: (t: Task) => boolean; bodyClass?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div ref={setNodeRef} className={clsx("flex min-h-0 flex-col rounded-xl border transition", column.className, isOver && "ring-2 ring-brand-500")}>
      {column.header}
      <div className={clsx("flex-1 space-y-2 overflow-y-auto p-2 thin-scroll", bodyClass)}>
        {column.tasks.map((t) => (
          <DraggableCard key={t.id} task={t} disabled={!canDrag(t)} />
        ))}
        {column.tasks.length === 0 && <div className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-ink-soft">Thả việc vào đây</div>}
      </div>
    </div>
  );
}

function DraggableCard({ task, disabled }: { task: Task; disabled: boolean }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id, disabled });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={clsx("touch-manipulation", isDragging && "opacity-30")}>
      <TaskCard task={task} />
    </div>
  );
}
