"use client";

import clsx from "clsx";
import { AlertTriangle, Flame, Star, X } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { daysLeft } from "@/lib/tasks";
import type { Task, TaskStatus, User } from "@/lib/types";

/* Hệ thống thiết kế dùng chung: mọi màn hình chỉ dùng các thành phần trong file này */

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      {...p}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
        variant === "secondary" && "border border-line bg-surface text-ink hover:bg-muted",
        variant === "ghost" && "text-ink-soft hover:bg-muted hover:text-ink",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-xl border border-line bg-surface shadow-sm", className)}>{children}</div>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {action}
    </div>
  );
}

export function Avatar({ user, size = 28 }: { user?: User; size?: number }) {
  const initials = user ? user.name.split(" ").slice(-2).map((w) => w[0]).join("") : "?";
  return (
    <span
      title={user?.name ?? "Chưa gán"}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface"
      style={{ width: size, height: size, fontSize: size * 0.38, background: user?.color ?? "#94a3b8" }}
    >
      {initials}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

export function PriorityBadges({ task }: { task: Task }) {
  return (
    <span className="inline-flex gap-1">
      {task.important && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <Star size={11} /> Quan trọng
        </span>
      )}
      {task.urgent && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          <Flame size={11} /> Khẩn cấp
        </span>
      )}
    </span>
  );
}

/** Nhãn hạn chót: đỏ khi quá hạn, vàng khi còn ≤ 3 ngày */
export function DueBadge({ task, today }: { task: Task; today: string }) {
  if (!task.dueDate) return <span className="text-xs text-ink-soft">Không hạn</span>;
  const d = daysLeft(task, today)!;
  const open = task.status !== "done";
  const text = !open ? formatDate(task.dueDate) : d < 0 ? `Quá hạn ${-d} ngày` : d === 0 ? "Hạn hôm nay" : d <= 7 ? `Còn ${d} ngày` : formatDate(task.dueDate);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs font-medium",
        open && d < 0 && "text-red-600 dark:text-red-400",
        open && d >= 0 && d <= 3 && "text-amber-600 dark:text-amber-400",
        (!open || d > 3) && "text-ink-soft",
      )}
    >
      {open && d < 0 && <AlertTriangle size={12} />}
      {text}
    </span>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "green" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={clsx("h-full rounded-full transition-all", tone === "green" ? "bg-emerald-500" : "bg-brand-600")} style={{ width: `${value}%` }} />
    </div>
  );
}

const fieldCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(fieldCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={clsx(fieldCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(fieldCls, "pr-8", p.className)} />;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={clsx("inline-flex cursor-pointer items-center gap-2 text-sm text-ink", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600")}
      >
        <span className={clsx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Ngăn kéo bên phải trên máy tính, toàn màn hình trên điện thoại */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-surface shadow-2xl animate-in">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 text-base font-semibold text-ink">{title}</div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-soft hover:bg-muted" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer && <div className="border-t border-line px-4 py-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">{text}</div>;
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
        {desc && <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Nút cần bấm 2 lần (không dùng confirm() vì một số trình xem chặn hộp thoại) */
export function ConfirmButton({ label, confirmLabel, onConfirm, ...p }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & { label: ReactNode; confirmLabel: string; onConfirm: () => void; variant?: Variant; size?: "sm" | "md" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <Button {...p} variant={armed ? "danger" : p.variant} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmLabel : label}
    </Button>
  );
}
