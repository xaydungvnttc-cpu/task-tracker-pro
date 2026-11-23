"use client";

import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Button, Card, ConfirmButton, Drawer, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { AVATAR_COLORS, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { HEALTH_LABEL, milestoneDelay, projectHealth } from "@/lib/projects";
import { can } from "@/lib/rbac";
import { newId } from "@/lib/tasks";
import type { Milestone, Project, ProjectStatus } from "@/lib/types";

const DOT = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-600" } as const;

function blankProject(color: string): Project {
  return { id: newId(), code: "", name: "", client: "", directorId: null, siteManagerId: null, memberIds: [], startDate: null, endDate: null, status: "active", milestones: [], color };
}

/** Danh sách dự án và mốc tiến độ hợp đồng. Quản trị, Quản lý thêm, sửa, xóa; GĐDA, CHT sửa dự án mình; người khác chỉ xem. */
export default function ProjectsPage() {
  const { me, projects, tasks, today, userById } = useApp();
  const [editing, setEditing] = useState<Project | null>(null);
  const edit = can.manageProjects(me!);
  const list = [...projects].sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.name.localeCompare(b.name, "vi"));

  return (
    <>
      <PageHeader
        title="Dự án"
        desc="Thông tin dự án và các mốc tiến độ theo hợp đồng. Mốc trễ sẽ làm đèn dự án chuyển vàng hoặc đỏ."
        actions={
          edit && (
            <Button variant="primary" size="sm" onClick={() => setEditing(blankProject(AVATAR_COLORS[projects.length % AVATAR_COLORS.length]))}>
              <Plus size={16} /> Thêm dự án
            </Button>
          )
        }
      />
      {list.length === 0 && <EmptyState text="Chưa có dự án nào" />}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((p) => {
          const h = projectHealth(p, tasks, today);
          return (
            <Card key={p.id} className={clsx(p.status === "done" && "opacity-70")}>
              <button className="block w-full p-4 text-left" onClick={() => setEditing(p)}>
                <div className="flex items-start gap-3">
                  <span className="rounded px-2 py-1 text-xs font-bold text-white" style={{ background: p.color }}>
                    {p.code || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">{p.name}</div>
                    <div className="text-xs text-ink-soft">
                      {p.client || "Chưa ghi Chủ đầu tư"} · {PROJECT_STATUS_LABEL[p.status]}
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <span className={clsx("h-2.5 w-2.5 rounded-full", DOT[h.health])} /> {HEALTH_LABEL[h.health]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-soft sm:grid-cols-4">
                  <div>
                    Khởi công
                    <div className="font-medium text-ink">{p.startDate ? formatDate(p.startDate, true) : "—"}</div>
                  </div>
                  <div>
                    Bàn giao HĐ
                    <div className="font-medium text-ink">{p.endDate ? formatDate(p.endDate, true) : "—"}</div>
                  </div>
                  <div>
                    Việc
                    <div className="font-medium text-ink">
                      {h.done}/{h.total} xong{h.overdue ? <span className="text-red-600 dark:text-red-400"> · {h.overdue} trễ</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Avatar user={userById(p.directorId)} size={22} />
                    <Avatar user={userById(p.siteManagerId)} size={22} />
                    <span className="ml-1">{new Set([p.directorId, p.siteManagerId, ...(p.memberIds ?? [])].filter(Boolean)).size} người</span>
                  </div>
                </div>
                {p.milestones.length > 0 && (
                  <ol className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
                    {[...p.milestones]
                      .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
                      .map((m) => {
                        const late = milestoneDelay(m, today);
                        return (
                          <li key={m.id} className="flex items-center gap-2">
                            <span className={clsx("h-2 w-2 shrink-0 rounded-full", m.actualDate ? "bg-emerald-500" : late ? "bg-red-500" : "bg-line")} />
                            <span className={clsx("flex-1", m.actualDate ? "text-ink-soft" : "text-ink")}>{m.name}</span>
                            <span className="text-ink-soft">{formatDate(m.plannedDate, true)}</span>
                            {late > 0 && <span className="font-semibold text-red-600 dark:text-red-400">chậm {late}n</span>}
                          </li>
                        );
                      })}
                  </ol>
                )}
              </button>
            </Card>
          );
        })}
      </div>
      {editing && <ProjectDrawer project={editing} readOnly={projects.some((p) => p.id === editing.id) ? !can.editProject(me!, editing) : !edit} canManage={edit} onClose={() => setEditing(null)} />}
    </>
  );
}

function ProjectDrawer({ project, readOnly, canManage, onClose }: { project: Project; readOnly: boolean; canManage: boolean; onClose: () => void }) {
  const { users, projects, saveProject, deleteProject } = useApp();
  const [d, setD] = useState<Project>(project);
  const isNew = !projects.some((p) => p.id === project.id);
  const set = (p: Partial<Project>) => setD({ ...d, ...p });
  const setMs = (id: string, p: Partial<Milestone>) => set({ milestones: d.milestones.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const valid = d.name.trim() && d.code.trim();

  const save = async () => {
    const ok = await saveProject({
      ...d,
      name: d.name.trim(),
      code: d.code.trim().toUpperCase().slice(0, 6),
      client: d.client.trim(),
      milestones: d.milestones.filter((m) => m.name.trim() && m.plannedDate),
    });
    if (ok) onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? "Thêm dự án" : readOnly ? "Thông tin dự án" : "Sửa dự án"}
      footer={
        !readOnly && (
          <div className="flex items-center gap-2">
            {!isNew && canManage && <ConfirmButton variant="ghost" className="text-red-600" label={<><Trash2 size={16} /> Xóa</>} confirmLabel="Bấm lần nữa để xóa" onConfirm={() => deleteProject(project).then(onClose)} />}
            <div className="flex-1" />
            <Button onClick={onClose}>Hủy</Button>
            <Button variant="primary" disabled={!valid} onClick={save}>
              {isNew ? "Thêm dự án" : "Lưu"}
            </Button>
          </div>
        )
      }
    >
      <fieldset disabled={readOnly} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
          <Field label="Tên dự án">
            <Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Chung cư Sông Hồng Residence" />
          </Field>
          <Field label="Mã ngắn" hint="2-6 ký tự">
            <Input value={d.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="SH" maxLength={6} />
          </Field>
        </div>
        <Field label="Chủ đầu tư">
          <Input value={d.client} onChange={(e) => set({ client: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Giám đốc dự án">
            <Select value={d.directorId ?? ""} disabled={!canManage} onChange={(e) => set({ directorId: e.target.value || null })}>
              <option value="">Chưa chọn</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Chỉ huy trưởng">
            <Select value={d.siteManagerId ?? ""} disabled={!canManage} onChange={(e) => set({ siteManagerId: e.target.value || null })}>
              <option value="">Chưa chọn</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-ink-soft">Thành viên dự án: chỉ những người này, GĐDA, CHT và Ban TGĐ xem được việc của dự án</span>
          <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
            {users
              .filter((u) => u.role !== "owner" && u.department !== "Ban Tổng Giám đốc")
              .map((u) => {
                const on = (d.memberIds ?? []).includes(u.id) || u.id === d.directorId || u.id === d.siteManagerId;
                return (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={u.id === d.directorId || u.id === d.siteManagerId}
                      onChange={(e) => set({ memberIds: e.target.checked ? [...(d.memberIds ?? []), u.id] : (d.memberIds ?? []).filter((x) => x !== u.id) })}
                    />
                    <span className="truncate">{u.name}</span>
                    <span className="truncate text-xs text-ink-soft">{u.title}</span>
                  </label>
                );
              })}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ngày khởi công">
            <Input type="date" value={d.startDate ?? ""} onChange={(e) => set({ startDate: e.target.value || null })} />
          </Field>
          <Field label="Ngày bàn giao theo hợp đồng">
            <Input type="date" value={d.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || null })} />
          </Field>
          <Field label="Trạng thái">
            <Select value={d.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
              {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Màu nhận diện">
            <Input type="color" className="h-10 p-1" value={d.color} onChange={(e) => set({ color: e.target.value })} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Mốc tiến độ hợp đồng</span>
            {!readOnly && (
              <Button size="sm" variant="ghost" onClick={() => set({ milestones: [...d.milestones, { id: newId(), name: "", plannedDate: "", actualDate: null }] })}>
                <Plus size={14} /> Thêm mốc
              </Button>
            )}
          </div>
          <p className="mb-2 text-xs text-ink-soft">Ví dụ: Xong móng, Cất nóc, Bàn giao. Điền ngày thực tế khi mốc hoàn thành.</p>
          <div className="space-y-2">
            {d.milestones.length === 0 && <EmptyState text="Chưa có mốc nào" />}
            {d.milestones.map((m) => (
              <div key={m.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_140px_140px_auto]">
                <Input value={m.name} onChange={(e) => setMs(m.id, { name: e.target.value })} placeholder="Tên mốc" className="col-span-2 sm:col-span-1" />
                <label className="text-[11px] text-ink-soft">
                  Dự kiến
                  <Input type="date" value={m.plannedDate} onChange={(e) => setMs(m.id, { plannedDate: e.target.value })} />
                </label>
                <label className="text-[11px] text-ink-soft">
                  Thực tế
                  <Input type="date" value={m.actualDate ?? ""} onChange={(e) => setMs(m.id, { actualDate: e.target.value || null })} />
                </label>
                {!readOnly && (
                  <button className="self-end rounded p-2 text-ink-soft hover:text-red-600" onClick={() => set({ milestones: d.milestones.filter((x) => x.id !== m.id) })} aria-label="Xóa mốc">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </fieldset>
    </Drawer>
  );
}
