"use client";

import clsx from "clsx";
import { AlarmClock, AlertTriangle, CalendarClock, CheckCircle2, ListTodo, Loader, Medal, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Card, CardTitle, EmptyState, Input, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { endOfMonth, endOfQuarter, addDays, startOfMonth, startOfQuarter, startOfWeek, monthLabel, addMonths } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { computeStats } from "@/lib/tasks";

type Period = "week" | "month" | "quarter" | "custom";

export default function DashboardPage() {
  const { scoped, users, today, me } = useApp();
  const [period, setPeriod] = useState<Period>("month");
  const [custom, setCustom] = useState({ from: startOfMonth(today), to: endOfMonth(today) });

  const [from, to] =
    period === "week"
      ? [startOfWeek(today), addDays(startOfWeek(today), 6)]
      : period === "month"
        ? [startOfMonth(today), endOfMonth(today)]
        : period === "quarter"
          ? [startOfQuarter(today), endOfQuarter(today)]
          : [custom.from, custom.to];

  const s = useMemo(() => computeStats(scoped, users, from, to, today), [scoped, users, from, to, today]);
  const maxForecast = Math.max(1, ...s.forecast.map((f) => f.count));
  const maxDept = Math.max(1, ...s.departments.map((d) => d.total));

  return (
    <>
      <PageHeader
        title="Bảng điều khiển"
        desc={`Từ ${from.split("-").reverse().join("/")} đến ${to.split("-").reverse().join("/")}`}
        actions={
          <>
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { value: "week", label: "Tuần này" },
                { value: "month", label: "Tháng này" },
                { value: "quarter", label: "Quý này" },
                { value: "custom", label: "Tùy chỉnh" },
              ]}
            />
            {period === "custom" && (
              <div className="flex items-center gap-1">
                <Input type="date" className="h-9 w-auto py-1" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                <span className="text-ink-soft">–</span>
                <Input type="date" className="h-9 w-auto py-1" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
              </div>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={ListTodo} label="Tổng việc" value={s.total} />
        <Kpi icon={CheckCircle2} label="Đã hoàn thành" value={s.done} tone="green" />
        <Kpi icon={Loader} label="Đang thực hiện" value={s.inProgress} tone="blue" />
        <Kpi icon={AlertTriangle} label="Quá hạn" value={s.overdue} tone="red" note="tính đến hôm nay" />
        <Kpi icon={AlarmClock} label="Sắp hạn ≤ 3 ngày" value={s.due3} tone="yellow" />
        <Kpi icon={CalendarClock} label="Sắp hạn ≤ 7 ngày" value={s.due7} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Tiến độ tổng</CardTitle>
          <div className="grid gap-5 p-4 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">Tiến độ bình quân</span>
                <span className="text-2xl font-bold">{s.progress}%</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={s.progress} />
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                {s.done}/{s.total} việc hoàn thành, việc dở dang tính theo checklist.
              </p>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">Hoàn thành đúng hạn</span>
                <span className="text-2xl font-bold">{s.onTimeRate === null ? "—" : `${s.onTimeRate}%`}</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={s.onTimeRate ?? 0} tone="green" />
              </div>
              <p className="mt-2 text-xs text-ink-soft">Tỷ lệ việc xong trước hoặc đúng hạn chót.</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Dự báo khối lượng {monthLabel(addMonths(startOfMonth(today), 1)).toLowerCase()}</CardTitle>
          <div className="p-4">
            <div className="flex h-36 items-end gap-[2px]">
              {s.forecast.map((f) => (
                <div key={f.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Tuần từ ${f.label}: ${f.count} việc đến hạn`}>
                  <span className="text-xs font-semibold text-ink">{f.count}</span>
                  <div className="w-full max-w-10 rounded-t bg-brand-500 transition group-hover:bg-brand-700" style={{ height: `${(f.count / maxForecast) * 100}%`, minHeight: f.count ? 4 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-[2px] border-t border-line pt-1">
              {s.forecast.map((f) => (
                <span key={f.label} className="flex-1 text-center text-[11px] text-ink-soft">
                  {f.label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">Số việc đến hạn theo tuần, gồm cả các kỳ việc định kỳ sẽ tự sinh.</p>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {can.viewReports(me!) && (
          <Card>
            <CardTitle>Bảng xếp hạng hiệu suất</CardTitle>
            <div className="divide-y divide-line">
              {s.leaderboard.length === 0 && (
                <div className="p-4">
                  <EmptyState text="Chưa có dữ liệu trong kỳ" />
                </div>
              )}
              {s.leaderboard.map((r, i) => (
                <div key={r.user.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", i < 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "text-ink-soft")}>
                    {i < 3 ? <Medal size={15} /> : i + 1}
                  </span>
                  <Avatar user={r.user} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.user.name}</div>
                    <div className="text-xs text-ink-soft">
                      Xong {r.done} · Đúng hạn {r.onTime} · Đang mở {r.open}
                      {r.overdue > 0 && <span className="text-red-600 dark:text-red-400"> · Quá hạn {r.overdue}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-bold" title="Điểm = Xong×10 + Đúng hạn×5 − Quá hạn×5">
                    {r.score}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className={clsx(!can.viewReports(me!) && "lg:col-span-2")}>
          <CardTitle>Phân bổ việc theo phòng ban</CardTitle>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-3">
              {STATUS_ORDER.map((st) => (
                <span key={st} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                  <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_DOT[st]}`} /> {STATUS_LABEL[st]}
                </span>
              ))}
            </div>
            {s.departments.length === 0 && <EmptyState text="Chưa có dữ liệu trong kỳ" />}
            {s.departments.map((d) => (
              <div key={d.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink">{d.name}</span>
                  <span className="text-ink-soft">{d.total} việc</span>
                </div>
                <div className="flex h-3 gap-[2px]" style={{ width: `${(d.total / maxDept) * 100}%` }}>
                  {STATUS_ORDER.filter((st) => d[st] > 0).map((st, i, arr) => (
                    <div
                      key={st}
                      title={`${d.name} · ${STATUS_LABEL[st]}: ${d[st]}`}
                      className={clsx(STATUS_DOT[st], "h-full hover:opacity-80", i === 0 && "rounded-l", i === arr.length - 1 && "rounded-r")}
                      style={{ flex: d[st] }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

const TONE: Record<string, string> = {
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  yellow: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  green: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
};

function Kpi({ icon: Icon, label, value, tone, note }: { icon: LucideIcon; label: string; value: number; tone?: string; note?: string }) {
  const alert = (tone === "red" || tone === "yellow") && value > 0;
  return (
    <div className={clsx("rounded-xl border border-line bg-surface p-4 shadow-sm", alert && TONE[tone!])}>
      <div className={clsx("flex items-center gap-2 text-xs font-medium", alert ? "" : "text-ink-soft")}>
        <Icon size={16} className={clsx(!alert && tone && TONE[tone])} /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {note && <div className="text-[11px] opacity-75">{note}</div>}
    </div>
  );
}
