"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Button, Card, CardTitle, Input, PageHeader, Select } from "@/components/ui";
import { AVATAR_COLORS, DEPARTMENTS, ROLE_DESC, ROLE_LABEL } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { isOverdue, newId } from "@/lib/tasks";
import type { Role, User } from "@/lib/types";

const ROLES: Role[] = ["owner", "manager", "editor", "member"];

export default function MembersPage() {
  const { users, me, tasks, today, saveUser, mode, toast } = useApp();
  const admin = can.manageMembers(me!);
  const [draft, setDraft] = useState({ name: "", email: "", department: DEPARTMENTS[1], role: "member" as Role });

  const update = (u: User, p: Partial<User>) => {
    if (u.id === me!.id && p.role && p.role !== "owner") return toast("Không thể tự hạ quyền Quản trị của chính mình", "error");
    saveUser({ ...u, ...p });
  };

  const add = () => {
    if (!draft.name.trim() || !draft.email.trim()) return;
    saveUser({ id: newId(), ...draft, color: AVATAR_COLORS[users.length % AVATAR_COLORS.length] });
    setDraft({ ...draft, name: "", email: "" });
    toast("Đã thêm thành viên. Mật khẩu mặc định bản dùng thử: demo123", "success");
  };

  return (
    <>
      <PageHeader title="Thành viên & phân quyền" desc={admin ? "Quản trị đổi được vai trò và phòng ban của mọi người." : "Chỉ Quản trị được đổi vai trò."} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>{users.length} thành viên</CardTitle>
          <div className="divide-y divide-line">
            {[...users].sort((a, b) => Number(!!b.pending) - Number(!!a.pending)).map((u) => {
              const mine = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done");
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar user={u} size={36} />
                  <div className="min-w-40 flex-1">
                    <div className="text-sm font-semibold">
                      {u.name} {u.id === me!.id && <span className="text-xs font-normal text-ink-soft">(bạn)</span>}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {u.email}
                      {u.title ? ` · ${u.title}` : ""} · {mine.length} việc đang mở
                      {mine.some((t) => isOverdue(t, today)) && <span className="text-red-600"> · có việc quá hạn</span>}
                    </div>
                  </div>
                  {u.pending && (
                    <>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">Chờ duyệt</span>
                      {admin && (
                        <Button size="sm" variant="primary" onClick={() => update(u, { pending: false })}>
                          Duyệt
                        </Button>
                      )}
                    </>
                  )}
                  <Select className="h-9 w-auto py-1 text-xs" disabled={!admin} value={u.department} onChange={(e) => update(u, { department: e.target.value })}>
                    {Array.from(new Set([...DEPARTMENTS, u.department])).map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </Select>
                  <Select className="h-9 w-auto py-1 text-xs" disabled={!admin} value={u.role} onChange={(e) => update(u, { role: e.target.value as Role })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardTitle>Vai trò</CardTitle>
            <dl className="space-y-2 p-4 text-sm">
              {ROLES.map((r) => (
                <div key={r}>
                  <dt className="font-semibold">{ROLE_LABEL[r]}</dt>
                  <dd className="text-xs text-ink-soft">{ROLE_DESC[r]}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {admin && (
            <Card>
              <CardTitle>Thêm thành viên</CardTitle>
              <div className="space-y-2 p-4">
                {mode === "demo" ? (
                  <>
                    <Input placeholder="Họ tên" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <Input placeholder="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                    <Select value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })}>
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </Select>
                    <Button variant="primary" className="w-full" onClick={add}>
                      <UserPlus size={16} /> Thêm
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-ink-soft">
                    Gửi link app cho đồng nghiệp để tự đăng ký (email hoặc Google). Tài khoản mới hiện "Chờ duyệt" ở đầu danh sách, chưa xem được gì. Bạn bấm Duyệt, chọn phòng ban và vai trò cho họ.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
