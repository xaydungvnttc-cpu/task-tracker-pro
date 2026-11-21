"use client";

import clsx from "clsx";
import { AtSign, Link2, Plus, Repeat, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";
import { Avatar, Button, ConfirmButton, Drawer, Field, Input, ProgressBar, Segmented, Select, Textarea, Toggle } from "./ui";
import { DEPARTMENTS, OFFICE, OFFICE_LABEL, FREQ_LABEL, STATUS_LABEL, STATUS_ORDER, TIME_TYPE_LABEL, WEEKDAY_SHORT } from "@/lib/constants";
import { addDays, formatDateTime, weekday } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { newId, nextOccurrence, progressOf } from "@/lib/tasks";
import type { LinkItem, RecurrenceFreq, Task, TimeType } from "@/lib/types";

function blankTask(createdBy: string, department: string, today: string, preset?: Partial<Task>): Task {
  return {
    id: newId(),
    title: "",
    description: "",
    assigneeId: null,
    watcherIds: [],
    department,
    important: false,
    urgent: false,
    timeType: "single",
    startDate: null,
    dueDate: today,
    status: "todo",
    checklist: [],
    inputLinks: [],
    outputLinks: [],
    requireOutput: false,
    recurrence: null,
    recurrenceSpawned: false,
    comments: [],
    completedAt: null,
    createdBy,
    createdAt: "",
    updatedAt: "",
    ...preset,
  };
}

export function TaskDrawer() {
  const { drawer, closeDrawer, tasks, projects, projectFilter, me, users, today, saveTask, deleteTask, addComment, userById } = useApp();
  const stored = drawer?.taskId ? tasks.find((t) => t.id === drawer.taskId) : undefined;
  const [draft, setDraft] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Mở ngăn kéo thì nạp bản nháp; dữ liệu thay đổi từ máy khác không ghi đè chỗ đang sửa
  useEffect(() => {
    if (!drawer || !me) return setDraft(null);
    if (drawer.isNew)
      setDraft(
        blankTask(me.id, me.department, today, {
          assigneeId: can.assignOthers(me) ? null : me.id,
          projectId: projectFilter === "all" || projectFilter === OFFICE ? null : projectFilter,
          ...drawer.preset,
        }),
      );
    else if (stored) setDraft(stored);
    setComment("");
  }, [drawer?.taskId, drawer?.isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!drawer || !draft || !me) return null;

  const isNew = drawer.isNew;
  const fullEdit = isNew ? can.createTask(me) : can.editTask(me, draft);
  const progressEdit = isNew || can.updateProgress(me, draft);
  const set = (p: Partial<Task>) => setDraft({ ...draft, ...p });

  const setTimeType = (tt: TimeType) => {
    if (tt === "none") set({ timeType: tt, startDate: null, dueDate: null });
    else if (tt === "single") set({ timeType: tt, startDate: null, dueDate: draft.dueDate ?? today });
    else set({ timeType: tt, startDate: draft.startDate ?? today, dueDate: draft.dueDate ?? addDays(today, 3) });
  };

  const setFreq = (f: RecurrenceFreq | "") => {
    if (!f) return set({ recurrence: null });
    set({ recurrence: { freq: f, weekdays: f === "weekly" ? [weekday(draft.dueDate ?? today)] : undefined } });
  };

  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    const keep = (l: LinkItem[]) => l.filter((x) => x.url.trim());
    const ok = await saveTask({
      ...draft,
      title: draft.title.trim(),
      checklist: draft.checklist.filter((c) => c.text.trim()),
      inputLinks: keep(draft.inputLinks),
      outputLinks: keep(draft.outputLinks),
    });
    setSaving(false);
    if (ok) closeDrawer();
  };

  const assignable = can.assignOthers(me) ? users : users.filter((u) => u.id === me.id);
  const pct = progressOf(draft);
  const next = draft.recurrence ? nextOccurrence(draft, today) : null;
  const outputMissing = draft.requireOutput && draft.outputLinks.length === 0;

  return (
    <Drawer
      open
      onClose={closeDrawer}
      title={isNew ? "Tạo việc mới" : fullEdit ? "Chi tiết công việc" : "Cập nhật tiến độ"}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && can.deleteTask(me) && (
            <ConfirmButton variant="ghost" className="text-red-600" label={<><Trash2 size={16} /> <span className="hidden sm:inline">Xóa</span></>} confirmLabel="Bấm lần nữa để xóa" onConfirm={() => deleteTask(draft)} />
          )}
          <div className="flex-1" />
          <Button onClick={closeDrawer}>Hủy</Button>
          <Button variant="primary" disabled={saving || !draft.title.trim() || !progressEdit} onClick={save}>
            {isNew ? "Tạo việc" : "Lưu thay đổi"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <input
          className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-ink-soft disabled:opacity-80"
          placeholder="Tên công việc..."
          value={draft.title}
          disabled={!fullEdit}
          onChange={(e) => set({ title: e.target.value })}
          autoFocus={isNew}
        />

        {draft.directive && (
          <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
            Chỉ đạo của Ban Tổng Giám đốc: người nhận báo kết quả bằng bình luận hoặc link bàn giao.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dự án">
            <Select value={draft.projectId ?? ""} disabled={!fullEdit} onChange={(e) => set({ projectId: e.target.value || null })}>
              <option value="">{OFFICE_LABEL}</option>
              {projects
                .filter((p) => p.status !== "done" || p.id === draft.projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Loại việc">
            <div className="flex h-10 items-center">
              <Toggle checked={!!draft.directive} disabled={!fullEdit || !can.viewReports(me)} onChange={(v) => set({ directive: v })} label="Chỉ đạo của Ban TGĐ" />
            </div>
          </Field>
          <Field label="Trạng thái">
            <Select value={draft.status} disabled={!progressEdit} onChange={(e) => set({ status: e.target.value as Task["status"] })}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Người thực hiện">
            <Select value={draft.assigneeId ?? ""} disabled={!fullEdit} onChange={(e) => set({ assigneeId: e.target.value || null })}>
              <option value="">Chưa gán</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.department}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Phòng ban / Mảng việc">
            <Select value={draft.department} disabled={!fullEdit} onChange={(e) => set({ department: e.target.value })}>
              {Array.from(new Set([...DEPARTMENTS, draft.department])).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mức độ">
            <div className="flex h-10 items-center gap-4">
              <Toggle checked={draft.important} disabled={!fullEdit} onChange={(v) => set({ important: v })} label="Quan trọng" />
              <Toggle checked={draft.urgent} disabled={!fullEdit} onChange={(v) => set({ urgent: v })} label="Khẩn cấp" />
            </div>
          </Field>
        </div>

        <Field label="Người theo dõi">
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => {
              const on = draft.watcherIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={!fullEdit}
                  onClick={() => set({ watcherIds: on ? draft.watcherIds.filter((x) => x !== u.id) : [...draft.watcherIds, u.id] })}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs",
                    on ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100" : "border-line text-ink-soft",
                  )}
                >
                  <Avatar user={u} size={20} /> {u.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="space-y-3 rounded-xl border border-line p-3">
          <Field label="Loại thời gian">
            <div className={clsx(!fullEdit && "pointer-events-none opacity-60")}>
              <Segmented value={draft.timeType} onChange={setTimeType} options={(Object.keys(TIME_TYPE_LABEL) as TimeType[]).map((v) => ({ value: v, label: TIME_TYPE_LABEL[v] }))} />
            </div>
          </Field>
          {draft.timeType !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              {draft.timeType === "multi" && (
                <Field label="Ngày bắt đầu">
                  <Input type="date" disabled={!fullEdit} value={draft.startDate ?? ""} onChange={(e) => set({ startDate: e.target.value || null })} />
                </Field>
              )}
              <Field label="Hạn chót">
                <Input type="date" disabled={!fullEdit} value={draft.dueDate ?? ""} min={draft.startDate ?? undefined} onChange={(e) => set({ dueDate: e.target.value || null })} />
              </Field>
            </div>
          )}
          <Field label="Lặp lại (việc định kỳ)">
            <Select value={draft.recurrence?.freq ?? ""} disabled={!fullEdit || draft.timeType === "none"} onChange={(e) => setFreq(e.target.value as RecurrenceFreq | "")}>
              <option value="">Không lặp</option>
              {(Object.keys(FREQ_LABEL) as RecurrenceFreq[]).map((f) => (
                <option key={f} value={f}>
                  {FREQ_LABEL[f]}
                </option>
              ))}
            </Select>
          </Field>
          {draft.recurrence?.freq === "weekly" && (
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const days = draft.recurrence!.weekdays ?? [];
                const on = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!fullEdit}
                    onClick={() => set({ recurrence: { freq: "weekly", weekdays: on ? days.filter((x) => x !== d) : [...days, d] } })}
                    className={clsx("h-8 w-10 rounded-lg border text-xs font-medium", on ? "border-brand-600 bg-brand-600 text-white" : "border-line text-ink-soft")}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
          )}
          {next && (
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Repeat size={13} /> Kỳ kế tiếp đến hạn {next.dueDate.split("-").reverse().join("/")}, tự sinh khi việc này hoàn thành hoặc khi tới kỳ.
            </p>
          )}
        </div>

        <Field label="Mô tả">
          <Textarea rows={3} disabled={!fullEdit} value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Yêu cầu, tiêu chí hoàn thành..." />
        </Field>

        {/* Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-soft">Các bước cần làm</span>
            <span className="text-xs font-semibold text-ink">{pct}%</span>
          </div>
          <ProgressBar value={pct} tone={pct === 100 ? "green" : "brand"} />
          {draft.checklist.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={c.done}
                disabled={!progressEdit}
                onChange={() => set({ checklist: draft.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
              />
              <Input
                className={clsx("h-8 py-1", c.done && "text-ink-soft line-through")}
                value={c.text}
                disabled={!fullEdit}
                onChange={(e) => set({ checklist: draft.checklist.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)) })}
              />
              {fullEdit && (
                <button className="p-1 text-ink-soft hover:text-red-600" onClick={() => set({ checklist: draft.checklist.filter((x) => x.id !== c.id) })} aria-label="Xóa bước">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {fullEdit && (
            <Button size="sm" variant="ghost" onClick={() => set({ checklist: [...draft.checklist, { id: newId(), text: "", done: false }] })}>
              <Plus size={14} /> Thêm bước
            </Button>
          )}
        </div>

        <LinkEditor label="Tài liệu đầu vào" links={draft.inputLinks} editable={fullEdit} onChange={(l) => set({ inputLinks: l })} />
        <div className={clsx("rounded-xl", outputMissing && "ring-2 ring-amber-400 ring-offset-2 ring-offset-surface")}>
          <LinkEditor label="Kết quả bàn giao" links={draft.outputLinks} editable={progressEdit} onChange={(l) => set({ outputLinks: l })} />
        </div>
        <Toggle checked={draft.requireOutput} disabled={!fullEdit} onChange={(v) => set({ requireOutput: v })} label="Bắt buộc có link kết quả khi Hoàn thành" />

        {/* Bình luận và @nhắc tên */}
        {!isNew && (
          <div className="space-y-3 border-t border-line pt-4">
            <span className="text-xs font-medium text-ink-soft">Trao đổi</span>
            {(stored?.comments ?? []).map((c) => {
              const u = userById(c.userId);
              return (
                <div key={c.id} className="flex gap-2">
                  <Avatar user={u} size={26} />
                  <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
                    <div className="text-xs">
                      <b>{u?.name ?? "?"}</b> <span className="text-ink-soft">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{c.text}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Viết trao đổi, gõ @Tên để nhắc..." onKeyDown={(e) => e.key === "Enter" && stored && (addComment(stored, comment), setComment(""))} />
              <Button variant="primary" disabled={!comment.trim() || !stored} onClick={() => stored && (addComment(stored, comment), setComment(""))} aria-label="Gửi">
                <Send size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <AtSign size={13} className="text-ink-soft" />
              {users
                .filter((u) => u.id !== me.id)
                .map((u) => (
                  <button key={u.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-ink-soft hover:text-ink" onClick={() => setComment((c) => `${c}${c && !c.endsWith(" ") ? " " : ""}@${u.name} `)}>
                    {u.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function LinkEditor({ label, links, editable, onChange }: { label: string; links: LinkItem[]; editable: boolean; onChange: (l: LinkItem[]) => void }) {
  const upd = (i: number, p: Partial<LinkItem>) => onChange(links.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {links.map((l, i) =>
        editable ? (
          <div key={i} className="flex gap-2">
            <Input className="h-8 w-2/5 py-1" placeholder="Tên tài liệu" value={l.label} onChange={(e) => upd(i, { label: e.target.value })} />
            <Input className="h-8 flex-1 py-1" placeholder="https://..." value={l.url} onChange={(e) => upd(i, { url: e.target.value })} />
            <button className="p-1 text-ink-soft hover:text-red-600" onClick={() => onChange(links.filter((_, j) => j !== i))} aria-label="Xóa link">
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
            <Link2 size={14} /> {l.label || l.url}
          </a>
        ),
      )}
      {!links.length && !editable && <p className="text-xs text-ink-soft">Chưa có</p>}
      {editable && (
        <Button size="sm" variant="ghost" onClick={() => onChange([...links, { label: "", url: "" }])}>
          <Plus size={14} /> Thêm link
        </Button>
      )}
    </div>
  );
}
