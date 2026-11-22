"use client";

import clsx from "clsx";
import { AlertTriangle, Building2, CheckCircle2, Download, Flag, ScrollText, Siren } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Button, Card, CardTitle, EmptyState, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { DEPARTMENTS, OFFICE, OFFICE_LABEL, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { addDays, addMonths, diffDays, endOfMonth, endOfQuarter, formatDate, startOfMonth, startOfQuarter } from "@/lib/dates";
import { downloadCsv, groupKpi, type KpiRow } from "@/lib/kpi";
import { HEALTH_LABEL, projectHealth, type Health } from "@/lib/projects";
import { RISK_LABEL, companyRisks } from "@/lib/early-warning";
import { AiReport } from "@/components/ai-report";
import { can } from "@/lib/rbac";
import { isOverdue, newId } from "@/lib/tasks";
import { LOAD_LABEL, workloadPlan, type Move } from "@/lib/workload";

const LIGHT: Record<Health, string> = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-600" };
const LIGHT_TEXT: Record<Health, string> = {
  green: "text-emerald-700 dark:text-emerald-400",
  yellow: "text-amber-700 dark:text-amber-400",
  red: "text-red-700 dark:text-red-400",
};

type Period = "month" | "last" | "quarter" | "year";
type GroupBy = "user" | "department" | "project";

/** Màn hình của Chủ tịch, TGĐ: cả công ty trên một trang, dự án nào đỏ thì bấm vào xem ngay */
export default function PortfolioPage() {
  const { me, tasks, projects, users, today, userById, setProjectFilter } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("month");
  const [groupBy, setGroupBy] = useState<GroupBy>("user");

  const rows = useMemo(
    () =>
      projects
        .filter((p) => p.status !== "done")
        .map((p) => projectHealth(p, tasks, today))
        .sort((a, b) => ["red", "yellow", "green"].indexOf(a.health) - ["red", "yellow", "green"].indexOf(b.health) || b.overdue - a.overdue),
    [projects, tasks, today],
  );
  const directives = tasks.filter((t) => t.directive && t.status !== "done");
  const directivesLate = directives.filter((t) => isOverdue(t, today));
  const overdueAll = tasks.filter((t) => isOverdue(t, today));

  const [from, to] =
    period === "month"
      ? [startOfMonth(today), endOfMonth(today)]
      : period === "last"
        ? [addMonths(startOfMonth(today), -1), endOfMonth(addMonths(startOfMonth(today), -1))]
        : period === "quarter"
          ? [startOfQuarter(today), endOfQuarter(today)]
          : [today.slice(0, 4) + "-01-01", today.slice(0, 4) + "-12-31"];

  const kpi: KpiRow[] = useMemo(() => {
    if (groupBy === "user") return groupKpi(tasks, users.map((u) => ({ key: u.id, label: u.name, sub: u.title || u.department })), (t) => t.assigneeId, from, to, today);
    if (groupBy === "department") {
      const names = Array.from(new Set([...DEPARTMENTS, ...tasks.map((t) => t.department)]));
      return groupKpi(tasks, names.map((n) => ({ key: n, label: n })), (t) => t.department, from, to, today);
    }
    return groupKpi(
      tasks,
      [...projects.map((p) => ({ key: p.id, label: `${p.code} · ${p.name}` })), { key: OFFICE, label: OFFICE_LABEL }],
      (t) => (t.projectId && projects.some((p) => p.id === t.projectId) ? t.projectId : OFFICE),
      from,
      to,
      today,
    );
  }, [groupBy, tasks, users, projects, from, to, today]);

  const open = (projectId: string) => {
    setProjectFilter(projectId);
    router.push("/dashboard");
  };

  if (!can.viewReports(me!)) return <EmptyState text="Màn hình này dành cho Ban Tổng Giám đốc và Quản lý." />;

  const exportKpi = () =>
    downloadCsv(`kpi-${groupBy}-${from}-${to}.csv`, [
      [groupBy === "user" ? "Nhân sự" : groupBy === "department" ? "Phòng ban" : "Dự án", "Chức danh", "Việc trong kỳ", "Đã xong", "Đúng hạn (%)", "Đang quá hạn", "Điểm"],
      ...kpi.map((r) => [r.label, r.sub ?? "", r.total, r.done, r.onTimeRate, r.overdue, r.score]),
    ]);

  return (
    <>
      <PageHeader title="Điều hành công ty" desc={`Tình hình các dự án và chỉ đạo, cập nhật đến ${formatDate(today, true)}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Tile icon={Building2} label="Dự án đang chạy" value={rows.length} />
        <Tile icon={Siren} label="Dự án báo động" value={rows.filter((r) => r.health === "red").length} tone="red" />
        <Tile icon={AlertTriangle} label="Dự án cần chú ý" value={rows.filter((r) => r.health === "yellow").length} tone="yellow" />
        <Tile icon={Flag} label="Việc quá hạn toàn công ty" value={overdueAll.length} tone="red" />
        <Tile icon={ScrollText} label="Chỉ đạo chưa xong" value={directives.length} tone={directivesLate.length ? "red" : undefined} note={directivesLate.length ? `${directivesLate.length} chỉ đạo đã quá hạn` : undefined} />
      </div>

      <EarlyWarning />
      <Workload />
      <AiReport />

      <Card className="mt-5">
        <CardTitle action={<Link href="/projects" className="text-xs font-medium text-brand-600">Quản lý dự án</Link>}>Các dự án</CardTitle>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState text="Chưa có dự án. Vào mục Dự án để thêm, hoặc nạp dữ liệu mẫu ở Cài đặt." />
          </div>
        ) : (
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-semibold">Dự án</th>
                  <th className="px-3 py-2 font-semibold">Tình trạng</th>
                  <th className="px-3 py-2 font-semibold">Việc hoàn thành</th>
                  <th className="px-3 py-2 text-right font-semibold">Quá hạn</th>
                  <th className="px-3 py-2 font-semibold">Mốc kế tiếp</th>
                  <th className="px-3 py-2 font-semibold">GĐ dự án · Chỉ huy trưởng</th>
                  <th className="px-4 py-2 font-semibold">Bàn giao HĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const p = r.project;
                  const m = r.nextMilestone;
                  const left = m ? diffDays(m.plannedDate, today) : null;
                  return (
                    <tr key={p.id} onClick={() => open(p.id)} className="cursor-pointer hover:bg-muted/60" title="Bấm để xem chi tiết dự án">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: p.color }}>
                            {p.code}
                          </span>
                          <span className="font-semibold text-ink">{p.name}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-soft">
                          {p.client || "Chưa ghi Chủ đầu tư"}
                          {p.status !== "active" && ` · ${PROJECT_STATUS_LABEL[p.status]}`}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={clsx("flex items-center gap-1.5 font-semibold", LIGHT_TEXT[r.health])}>
                          <span className={clsx("h-3 w-3 rounded-full", LIGHT[r.health])} /> {HEALTH_LABEL[r.health]}
                        </div>
                        {r.reasons.length > 0 && <div className="mt-0.5 max-w-64 text-xs text-ink-soft">{r.reasons.slice(0, 2).join("; ")}</div>}
                      </td>
                      <td className="w-44 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={r.progress} tone={r.progress === 100 ? "green" : "brand"} />
                          <span className="text-xs font-semibold">{r.progress}%</span>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-soft">
                          {r.done}/{r.total} việc
                        </div>
                      </td>
                      <td className={clsx("px-3 py-3 text-right font-semibold", r.overdue ? "text-red-600 dark:text-red-400" : "text-ink-soft")}>{r.overdue}</td>
                      <td className="px-3 py-3">
                        {m ? (
                          <>
                            <div className="font-medium text-ink">{m.name}</div>
                            <div className={clsx("text-xs", left! < 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-soft")}>
                              {formatDate(m.plannedDate, true)} · {left! < 0 ? `chậm ${-left!} ngày` : left === 0 ? "hôm nay" : `còn ${left} ngày`}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-ink-soft">Chưa có mốc</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Avatar user={userById(p.directorId)} size={24} />
                          <Avatar user={userById(p.siteManagerId)} size={24} />
                          <span className="ml-1 truncate text-xs text-ink-soft">{userById(p.directorId)?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{p.endDate ? formatDate(p.endDate, true) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle action={<Link href="/directives" className="text-xs font-medium text-brand-600">Xem sổ chỉ đạo</Link>}>Chỉ đạo quá hạn</CardTitle>
          <div className="divide-y divide-line">
            {directivesLate.length === 0 && (
              <div className="flex items-center gap-2 p-4 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Không có chỉ đạo quá hạn
              </div>
            )}
            {directivesLate.slice(0, 8).map((t) => (
              <DirectiveLine key={t.id} id={t.id} />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle
            action={
              <Button size="sm" onClick={exportKpi} disabled={!kpi.length}>
                <Download size={14} /> Xuất Excel
              </Button>
            }
          >
            Đánh giá hiệu quả (KPI)
          </CardTitle>
          <div className="flex flex-wrap gap-2 border-b border-line p-3">
            <Segmented value={groupBy} onChange={setGroupBy} options={[{ value: "user", label: "Theo người" }, { value: "department", label: "Theo phòng ban" }, { value: "project", label: "Theo dự án" }]} />
            <Segmented value={period} onChange={setPeriod} options={[{ value: "month", label: "Tháng này" }, { value: "last", label: "Tháng trước" }, { value: "quarter", label: "Quý này" }, { value: "year", label: "Năm nay" }]} />
          </div>
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">{groupBy === "user" ? "Nhân sự" : groupBy === "department" ? "Phòng ban" : "Dự án"}</th>
                  <th className="px-2 py-2 text-right font-semibold">Việc trong kỳ</th>
                  <th className="px-2 py-2 text-right font-semibold">Đã xong</th>
                  <th className="px-2 py-2 text-right font-semibold">Đúng hạn</th>
                  <th className="px-2 py-2 text-right font-semibold">Đang quá hạn</th>
                  <th className="px-4 py-2 text-right font-semibold" title="Xong×10 + Đúng hạn×5 − Quá hạn×5">
                    Điểm
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {kpi.map((r, i) => (
                  <tr key={r.key}>
                    <td className="px-4 py-2 text-xs text-ink-soft">{i + 1}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink">{r.label}</div>
                      {r.sub && <div className="text-xs text-ink-soft">{r.sub}</div>}
                    </td>
                    <td className="px-2 py-2 text-right">{r.total}</td>
                    <td className="px-2 py-2 text-right">{r.done}</td>
                    <td className={clsx("px-2 py-2 text-right", r.onTimeRate !== null && r.onTimeRate < 70 && "font-semibold text-amber-700 dark:text-amber-400")}>{r.onTimeRate === null ? "—" : `${r.onTimeRate}%`}</td>
                    <td className={clsx("px-2 py-2 text-right", r.overdue > 0 && "font-semibold text-red-600 dark:text-red-400")}>{r.overdue}</td>
                    <td className="px-4 py-2 text-right font-bold">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {kpi.length === 0 && (
              <div className="p-4">
                <EmptyState text="Chưa có dữ liệu trong kỳ" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function DirectiveLine({ id }: { id: string }) {
  const { tasks, openTask, userById, projectById, today } = useApp();
  const t = tasks.find((x) => x.id === id)!;
  const p = projectById(t.projectId);
  return (
    <button onClick={() => openTask(t.id)} className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-muted">
      <Avatar user={userById(t.assigneeId)} size={26} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{t.title}</div>
        <div className="text-xs text-ink-soft">
          {userById(t.assigneeId)?.name ?? "Chưa giao"} · {p ? p.code : OFFICE_LABEL} ·{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">quá hạn {diffDays(today, t.dueDate!)} ngày</span>
        </div>
      </div>
    </button>
  );
}

const TONE: Record<string, string> = {
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  yellow: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
};

function Tile({ icon: Icon, label, value, tone, note }: { icon: typeof Flag; label: string; value: number; tone?: "red" | "yellow"; note?: string }) {
  const alert = !!tone && value > 0;
  return (
    <div className={clsx("rounded-xl border border-line bg-surface p-4 shadow-sm", alert && TONE[tone!])}>
      <div className={clsx("flex items-center gap-2 text-xs font-medium", !alert && "text-ink-soft")}>
        <Icon size={16} /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {note && <div className="text-[11px] opacity-80">{note}</div>}
    </div>
  );
}

/**
 * Cân đối tải việc: thanh tải từng người và đề xuất chuyển bớt việc chưa bắt đầu sang người cùng phòng, cùng dự án.
 * Bấm "Giao lại" là đổi người thực hiện, kèm một bình luận ghi lý do để hai bên cùng biết.
 */
function Workload() {
  const { tasks, users, projects, today, me, saveTask, openTask, projectById } = useApp();
  const { rows, moves, gaps, avg } = useMemo(() => workloadPlan(tasks, users, projects, today), [tasks, users, projects, today]);
  const [busy, setBusy] = useState(false);
  const max = Math.max(1, ...rows.map((r) => r.open));
  const canMove = can.assignOthers(me!);
  const apply = (m: Move) =>
    saveTask({
      ...m.task,
      assigneeId: m.to.id,
      comments: [...m.task.comments, { id: newId(), userId: me!.id, text: `Chuyển từ ${m.from.name} sang ${m.to.name} để cân đối tải việc: ${m.reason}.`, createdAt: new Date().toISOString() }],
    });
  const applyAll = async () => {
    setBusy(true);
    for (const m of moves) await apply(m);
    setBusy(false);
  };
  return (
    <Card className="mt-5">
      <CardTitle
        action={
          canMove && moves.length > 1 ? (
            <Button size="sm" variant="primary" disabled={busy} onClick={applyAll}>
              Giao lại cả {moves.length} việc
            </Button>
          ) : undefined
        }
      >
        Cân đối tải việc
      </CardTitle>
      <div className="grid gap-5 p-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs text-ink-soft">Việc đang mở mỗi người (bình quân {avg.toFixed(1)}). Phần đỏ là việc quá hạn.</div>
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.user.id} className="flex items-center gap-2 text-sm">
                <span className="w-36 shrink-0 truncate" title={r.user.title}>
                  {r.user.name}
                </span>
                <div className="flex h-3 flex-1 overflow-hidden rounded bg-muted">
                  <div className="bg-red-500" style={{ width: `${(r.overdue / max) * 100}%` }} />
                  <div className={r.level === "over" ? "bg-amber-500" : r.level === "free" ? "bg-emerald-500" : "bg-brand-600"} style={{ width: `${((r.open - r.overdue) / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs font-semibold">{r.open}</span>
                <span
                  className={clsx(
                    "w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold",
                    r.level === "over" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : r.level === "free" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-ink-soft",
                  )}
                >
                  {LOAD_LABEL[r.level]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-ink-soft">Đề xuất giao lại việc chưa bắt đầu (không đụng chỉ đạo và việc đã quá hạn)</div>
          {moves.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} /> Tải việc đang cân đối, chưa cần chuyển.
            </div>
          ) : (
            <div className="space-y-1.5">
              {moves.map((m) => (
                <div key={m.task.id} className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => openTask(m.task.id)}>
                    <div className="text-sm font-medium">{m.task.title}</div>
                    <div className="text-xs text-ink-soft">
                      {projectById(m.task.projectId)?.code ?? OFFICE_LABEL} · {m.from.name} → <b className="text-ink">{m.to.name}</b>
                      {m.task.dueDate ? ` · hạn ${formatDate(m.task.dueDate)}` : ""}
                    </div>
                  </button>
                  {canMove && (
                    <Button size="sm" disabled={busy} onClick={() => apply(m)}>
                      Giao lại
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {gaps.length > 0 && (
            <>
              <div className="mb-2 mt-4 text-xs text-ink-soft">Cần Ban TGĐ quyết: quá tải nhưng trong phòng không còn ai đỡ được</div>
              <div className="space-y-1.5">
                {gaps.map((g) => (
                  <div key={g.user.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <b>{g.user.name}</b> ({g.user.department}) đang có {g.open} việc mở{g.overdue ? `, ${g.overdue} quá hạn` : ""}. Đề xuất bổ sung người cho phòng, hoặc giãn hạn các việc chưa gấp.
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Cảnh báo sớm: dự án có nguy cơ chậm và phương án xử lý đề xuất.
 * Bấm "Giao việc" là tạo ngay một chỉ đạo cho Giám đốc dự án, có sẵn hạn, để không bị động.
 */
function EarlyWarning() {
  const { tasks, projects, today, newTask, me } = useApp();
  const risks = useMemo(() => companyRisks(projects, tasks, today), [projects, tasks, today]);
  return (
    <Card className="mt-5">
      <CardTitle>Cảnh báo sớm và phương án xử lý</CardTitle>
      {risks.length === 0 ? (
        <div className="p-4">
          <EmptyState text="Chưa thấy dự án nào có nguy cơ chậm." />
        </div>
      ) : (
        <div className="divide-y divide-line">
          {risks.map((r) => (
            <div key={r.project.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: r.project.color }}>
                  {r.project.code}
                </span>
                <span className="text-sm font-semibold">{r.project.name}</span>
                <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.level === "high" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300")}>
                  {RISK_LABEL[r.level]}
                </span>
              </div>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-ink-soft">
                {r.signals.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div className="mt-2 space-y-1.5">
                {r.actions.map((a) => (
                  <div key={a.text} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="flex-1">{a.text}</span>
                    <span className="shrink-0 text-xs text-ink-soft">hạn {formatDate(addDays(today, a.inDays))}</span>
                    {can.createTask(me!) && (
                      <Button
                        size="sm"
                        onClick={() =>
                          newTask({
                            title: a.text,
                            projectId: r.project.id,
                            directive: true,
                            important: true,
                            urgent: a.inDays <= 2,
                            assigneeId: r.project.directorId,
                            department: "Ban Chỉ huy công trường",
                            timeType: "single",
                            dueDate: addDays(today, a.inDays),
                            description: `Phương án xử lý từ cảnh báo sớm ngày ${formatDate(today, true)}:\n- ${r.signals.join("\n- ")}`,
                          })
                        }
                      >
                        Giao việc
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
