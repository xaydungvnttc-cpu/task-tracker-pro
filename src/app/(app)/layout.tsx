"use client";

import clsx from "clsx";
import {
  Bell,
  Building2,
  Gauge,
  ScrollText,
  CalendarDays,
  CalendarCheck,
  Grid2x2,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import { Logo } from "@/components/logo";
import { TaskDrawer } from "@/components/task-drawer";
import { Avatar, Button, Select } from "@/components/ui";
import { auth } from "@/lib/backend";
import { OFFICE, OFFICE_LABEL, ROLE_LABEL, SCOPE_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { seesAllProjects } from "@/lib/projects";
import { can } from "@/lib/rbac";
import type { Scope, User } from "@/lib/types";

const NAV: { href: string; label: string; icon: typeof Bell; mobile: boolean; show?: (u: User) => boolean }[] = [
  { href: "/portfolio", label: "Điều hành công ty", icon: Gauge, mobile: false, show: can.viewReports },
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
  { href: "/today", label: "Hôm nay", icon: CalendarCheck, mobile: true },
  { href: "/tasks", label: "Danh sách việc", icon: ListTodo, mobile: false },
  { href: "/directives", label: "Sổ chỉ đạo", icon: ScrollText, mobile: false },
  { href: "/matrix", label: "Ma trận ưu tiên", icon: Grid2x2, mobile: true },
  { href: "/kanban", label: "Bảng tiến độ", icon: KanbanSquare, mobile: true },
  { href: "/calendar", label: "Lịch biểu", icon: CalendarDays, mobile: true },
  { href: "/projects", label: "Dự án", icon: Building2, mobile: false },
  { href: "/members", label: "Thành viên", icon: Users, mobile: false },
  { href: "/settings", label: "Cài đặt tích hợp", icon: Settings, mobile: false },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { ready, me, mode } = useApp();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !me) router.replace("/login");
  }, [ready, me, router]);
  useEffect(() => setMenuOpen(false), [pathname]);

  if (!ready || !me)
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        <Loader2 className="animate-spin" />
      </div>
    );

  // Tài khoản mới tự đăng nhập: chưa xem được gì cho tới khi Quản trị bấm Duyệt ở mục Thành viên
  if (me.pending)
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-lg font-semibold">Tài khoản đang chờ duyệt</div>
          <p className="mt-2 text-sm text-ink-soft">
            Chào {me.name}. Để giữ an toàn dữ liệu công ty, Quản trị cần duyệt tài khoản ({me.email}) ở mục Thành viên. Duyệt xong anh chị tải lại trang là dùng được.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => location.reload()}>Tải lại</Button>
            <Button variant="ghost" onClick={() => auth.logout()}>Đăng xuất</Button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Thanh bên: cố định trên máy tính, trượt ra trên điện thoại/iPad dọc */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-steel-900 text-slate-200 transition-transform lg:translate-x-0",
          menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard">
            <Logo light />
          </Link>
          <button className="rounded p-1 text-slate-300 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>
        <div className="mx-3 mb-1">
          <ProjectPicker />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {NAV.filter((n) => !n.show || n.show(me)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "flex items-center gap-3 rounded-r-lg border-l-[3px] px-3 py-2 text-sm font-medium",
                pathname.startsWith(n.href) ? "border-safety-500 bg-white/10 text-white" : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <n.icon size={18} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <Avatar user={me} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{me.name}</div>
              <div className="truncate text-xs text-slate-400">
                {ROLE_LABEL[me.role]} · {me.department}
              </div>
            </div>
            <button onClick={() => auth.logout()} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
          {mode === "demo" && <div className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-center text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">Bản dùng thử · dữ liệu lưu trên trình duyệt</div>}
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <Header onMenu={() => setMenuOpen(true)} />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-4 sm:px-6 lg:pb-10">{children}</main>

      {/* Thanh điều hướng dưới cho điện thoại */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => n.mobile).map((n) => (
          <Link key={n.href} href={n.href} className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px]", pathname.startsWith(n.href) ? "text-brand-600" : "text-ink-soft")}>
            <n.icon size={20} />
            {n.label}
          </Link>
        ))}
      </nav>

      <TaskDrawer />
    </div>
  );
}

/** Chọn dự án: mọi màn hình (tổng quan, danh sách, bảng tiến độ, lịch…) chỉ hiện việc của dự án đang chọn */
function ProjectPicker() {
  const { projects, projectFilter, setProjectFilter, me } = useApp();
  const active = projects.filter((p) => p.status !== "done" || p.id === projectFilter).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return (
    <label className="block rounded-lg bg-white/10 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-safety-400">Đang xem</span>
      <Select className="mt-1 h-8 border-0 bg-white py-0 text-xs font-semibold text-slate-900" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Chọn dự án">
        <option value="all">{seesAllProjects(me) ? "Cả công ty" : "Tất cả dự án của tôi"}</option>
        {active.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
        <option value={OFFICE}>{OFFICE_LABEL}</option>
      </Select>
    </label>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { me, scope, setScope, newTask } = useApp();
  const scopes = Object.keys(SCOPE_LABEL) as Scope[];
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="-ml-1 rounded-lg p-2 text-ink-soft hover:bg-muted lg:hidden" aria-label="Mở menu">
        <Menu size={20} />
      </button>
      {/* Bộ lọc phạm vi áp dụng cho mọi màn hình */}
      <div className="hidden rounded-lg border border-line bg-muted p-0.5 md:inline-flex">
        {scopes.map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={clsx("rounded-md px-3 py-1.5 text-xs font-medium", scope === s ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}
          >
            {s === "team" ? `Đội nhóm · ${me!.department}` : SCOPE_LABEL[s]}
          </button>
        ))}
      </div>
      <Select className="h-9 w-auto py-1 text-xs md:hidden" value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label="Phạm vi">
        {scopes.map((s) => (
          <option key={s} value={s}>
            {SCOPE_LABEL[s]}
          </option>
        ))}
      </Select>
      <div className="flex-1" />
      <NotificationBell />
      {can.createTask(me!) && (
        <Button variant="primary" size="sm" className="h-9" onClick={() => newTask()}>
          <Plus size={16} /> <span className="hidden sm:inline">Tạo việc</span>
        </Button>
      )}
    </header>
  );
}

function NotificationBell() {
  const { notifications, markRead, openTask } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 text-ink-soft hover:bg-muted" aria-label="Thông báo">
        <Bell size={20} />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-hidden rounded-xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Thông báo</span>
            {unread.length > 0 && (
              <button className="text-xs font-medium text-brand-600" onClick={() => markRead(unread.map((n) => n.id))}>
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-soft">Chưa có thông báo</p>}
            {notifications.slice(0, 50).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead([n.id]);
                  if (n.taskId) openTask(n.taskId);
                  setOpen(false);
                }}
                className={clsx("block w-full border-b border-line px-4 py-2.5 text-left hover:bg-muted", !n.read && "bg-brand-50/60 dark:bg-brand-700/10")}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                  {n.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{n.body}</div>
                <div className="mt-0.5 text-[11px] text-ink-soft">{formatDateTime(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
