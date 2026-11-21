"use client";

import { CheckCircle2, LayoutDashboard, Loader2, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Button, Field, Input, Segmented, Select } from "@/components/ui";
import { auth } from "@/lib/backend";
import { DEMO_PASSWORD } from "@/lib/backend/local";
import { DEPARTMENTS, ROLE_DESC, ROLE_LABEL } from "@/lib/constants";
import { SEED_USERS } from "@/lib/seed";

export default function LoginPage() {
  const { me, ready, mode } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", department: DEPARTMENTS[1] });

  useEffect(() => {
    if (ready && me) router.replace("/dashboard");
  }, [ready, me, router]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => (tab === "login" ? auth.login(form.email, form.password) : auth.register(form.name, form.email, form.password, form.department)));
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-700 to-indigo-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-bold">
          <LayoutDashboard /> Task Tracker Pro
        </div>
        <div className="space-y-5">
          <h2 className="text-3xl font-bold leading-tight">Giao việc rõ ràng, theo dõi sát sao, nhắc việc tự động.</h2>
          <ul className="space-y-2 text-white/85">
            {["Dashboard KPI, Kanban, Ma trận Eisenhower, Lịch Gantt", "Việc định kỳ tự sinh, checklist, bàn giao có link kết quả", "Nhắc 8:00 sáng và báo cáo tuần qua Zalo, Telegram, Email"].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 size={20} className="shrink-0 text-emerald-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">Cài lên màn hình chính điện thoại, iPad như một ứng dụng.</p>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <div className="inline-flex items-center gap-2 text-xl font-bold text-brand-600">
              <LayoutDashboard /> Task Tracker Pro
            </div>
          </div>

          {mode === "demo" && (
            <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-700/40 dark:bg-brand-700/10">
              <Button variant="primary" className="h-12 w-full text-base" disabled={busy} onClick={() => run(() => auth.loginDemo("u1"))}>
                <Rocket size={18} /> Đăng nhập nhanh bản Demo (1-Click)
              </Button>
              <p className="text-center text-xs text-ink-soft">Vào bằng vai trò Owner. Hoặc thử từng vai trò để xem phân quyền:</p>
              <div className="grid grid-cols-2 gap-2">
                {SEED_USERS.slice(1, 5).map((u) => (
                  <button
                    key={u.id}
                    disabled={busy}
                    onClick={() => run(() => auth.loginDemo(u.id))}
                    title={ROLE_DESC[u.role]}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5 text-left hover:border-brand-500"
                  >
                    <Avatar user={u} size={26} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-ink">{u.name}</span>
                      <span className="block text-[11px] text-ink-soft">{ROLE_LABEL[u.role]}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex justify-center">
              <Segmented value={tab} onChange={setTab} options={[{ value: "login", label: "Đăng nhập" }, { value: "register", label: "Đăng ký" }]} />
            </div>
            <form onSubmit={submit} className="space-y-3">
              {tab === "register" && (
                <>
                  <Field label="Họ và tên">
                    <Input required value={form.name} onChange={set("name")} placeholder="Nguyễn Văn A" />
                  </Field>
                  <Field label="Phòng ban">
                    <Select value={form.department} onChange={set("department")}>
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </Select>
                  </Field>
                </>
              )}
              <Field label="Email">
                <Input required type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="ban@congty.vn" />
              </Field>
              <Field label="Mật khẩu" hint={mode === "demo" && tab === "login" ? `Tài khoản mẫu: an@demo.vn / ${DEMO_PASSWORD}` : undefined}>
                <Input required type="password" minLength={6} autoComplete={tab === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} />
              </Field>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              </Button>
            </form>
            <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
              <span className="h-px flex-1 bg-line" /> hoặc <span className="h-px flex-1 bg-line" />
            </div>
            <Button className="w-full" disabled={busy} onClick={() => run(() => auth.loginGoogle())}>
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Tiếp tục với Google
            </Button>
            {mode === "demo" && <p className="mt-3 text-center text-[11px] text-ink-soft">Bản Demo lưu dữ liệu ngay trên trình duyệt này. Điền key Firebase để bật đăng nhập thật.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
