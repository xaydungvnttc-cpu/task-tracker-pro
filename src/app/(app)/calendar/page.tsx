"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Download, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button, PageHeader, Segmented } from "@/components/ui";
import { IS_STATIC_DEMO, STATUS_DOT, STATUS_LABEL, STATUS_ORDER, WEEKDAY_SHORT } from "@/lib/constants";
import { addDays, addMonths, endOfMonth, formatDate, monthLabel, overlaps, startOfMonth, startOfWeek } from "@/lib/dates";
import { buildICS } from "@/lib/ics";
import { isOverdue } from "@/lib/tasks";
import type { Task } from "@/lib/types";

export default function CalendarPage() {
  const { scoped, today } = useApp();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(today);
  const dated = scoped.filter((t) => t.dueDate);

  const weeks: string[][] = [];
  if (view === "month") {
    const last = endOfMonth(cursor);
    for (let w = startOfWeek(startOfMonth(cursor)); w <= last; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  } else {
    const w = startOfWeek(cursor);
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  }

  const move = (n: number) => setCursor(view === "month" ? addMonths(startOfMonth(cursor), n) : addDays(cursor, 7 * n));
  const title = view === "month" ? monthLabel(cursor) : `Tuần ${formatDate(weeks[0][0])} – ${formatDate(weeks[0][6], true)}`;

  const exportIcs = () => {
    const blob = new Blob([buildICS(dated, window.location.origin)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `task-tracker-${today}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Lịch biểu"
        desc="Thanh ngang thể hiện việc kéo dài nhiều ngày, từ ngày bắt đầu tới hạn chót."
        actions={
          !IS_STATIC_DEMO && <>
            <Button size="sm" onClick={exportIcs}>
              <Download size={14} /> Xuất .ics
            </Button>
            <Link href="/settings#calendar">
              <Button size="sm">
                <Link2 size={14} /> Đồng bộ Google Calendar
              </Button>
            </Link>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => move(-1)} aria-label="Trước">
          <ChevronLeft size={16} />
        </Button>
        <Button size="sm" onClick={() => setCursor(today)}>
          Hôm nay
        </Button>
        <Button size="sm" variant="ghost" onClick={() => move(1)} aria-label="Sau">
          <ChevronRight size={16} />
        </Button>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex-1" />
        <Segmented value={view} onChange={setView} options={[{ value: "month", label: "Tháng" }, { value: "week", label: "Tuần" }]} />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 thin-scroll sm:mx-0 sm:px-0">
        <div className="min-w-[680px] overflow-hidden rounded-xl border border-line bg-surface">
          <div className="grid grid-cols-7 border-b border-line bg-muted">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <div key={d} className="px-2 py-1.5 text-xs font-semibold text-ink-soft">
                {WEEKDAY_SHORT[d]}
              </div>
            ))}
          </div>
          {weeks.map((days) => (
            <WeekRow key={days[0]} days={days} tasks={dated} month={view === "month" ? cursor.slice(0, 7) : null} maxLanes={view === "month" ? 3 : 30} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className={`h-2.5 w-4 rounded-sm ${STATUS_DOT[s]}`} /> {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className="h-2.5 w-4 rounded-sm bg-red-500" /> Quá hạn
        </span>
      </div>
    </>
  );
}

/** Một hàng tuần: xếp các thanh vào "làn" sao cho không chồng nhau */
function WeekRow({ days, tasks, month, maxLanes }: { days: string[]; tasks: Task[]; month: string | null; maxLanes: number }) {
  const { today, openTask } = useApp();
  const ws = days[0];
  const we = days[6];
  const items = tasks
    .map((t) => ({ t, s: t.startDate && t.startDate <= t.dueDate! ? t.startDate : t.dueDate! , e: t.dueDate! }))
    .filter((x) => overlaps(x.s, x.e, ws, we))
    .sort((a, b) => a.s.localeCompare(b.s) || b.e.localeCompare(a.e));

  const laneEnds: string[] = [];
  const placed = items.map((x) => {
    let lane = laneEnds.findIndex((end) => end < x.s);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = x.e;
    return { ...x, lane };
  });
  const visible = placed.filter((p) => p.lane < maxLanes);
  const hidden = days.map((d) => placed.filter((p) => p.lane >= maxLanes && p.s <= d && d <= p.e).length);
  const lanes = Math.min(laneEnds.length, maxLanes);

  return (
    <div className="relative grid grid-cols-7 border-b border-line last:border-b-0" style={{ gridTemplateRows: `28px repeat(${lanes}, 24px) 22px`, minHeight: month ? 116 : 220 }}>
      {days.map((d, i) => (
        <div
          key={d}
          className={clsx("border-r border-line last:border-r-0", month && d.slice(0, 7) !== month && "bg-muted/50")}
          style={{ gridColumn: i + 1, gridRow: `1 / span ${lanes + 2}` }}
        />
      ))}
      {days.map((d, i) => (
        <div key={d + "n"} className="px-2 pt-1 text-xs" style={{ gridColumn: i + 1, gridRow: 1 }}>
          <span className={clsx("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1", d === today ? "bg-brand-600 font-bold text-white" : month && d.slice(0, 7) !== month ? "text-ink-soft/60" : "text-ink-soft")}>
            {Number(d.slice(8))}
          </span>
        </div>
      ))}
      {visible.map(({ t, s, e, lane }) => {
        const from = s < ws ? 0 : days.indexOf(s);
        const to = e > we ? 6 : days.indexOf(e);
        return (
          <button
            key={t.id}
            onClick={() => openTask(t.id)}
            title={`${t.title} · ${STATUS_LABEL[t.status]} · ${formatDate(s)}–${formatDate(e)}`}
            className={clsx(
              "z-10 mx-0.5 my-[2px] truncate px-2 text-left text-[11px] font-medium leading-5 text-white hover:brightness-110",
              isOverdue(t, today) ? "bg-red-500" : STATUS_DOT[t.status],
              t.status === "done" && "line-through opacity-75",
              s >= ws ? "rounded-l-md" : "rounded-l-none",
              e <= we ? "rounded-r-md" : "rounded-r-none",
            )}
            style={{ gridColumn: `${from + 1} / ${to + 2}`, gridRow: lane + 2 }}
          >
            {t.title}
          </button>
        );
      })}
      {hidden.map((n, i) =>
        n > 0 ? (
          <div key={i} className="z-10 px-2 text-[11px] font-medium text-ink-soft" style={{ gridColumn: i + 1, gridRow: lanes + 2 }}>
            +{n} việc
          </div>
        ) : null,
      )}
    </div>
  );
}
