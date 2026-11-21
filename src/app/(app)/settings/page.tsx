"use client";

import { Bell, CalendarDays, Copy, Database, Loader2, Mail, MessageCircle, Plus, RotateCcw, Send, Trash2, Webhook, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import { Button, Card, ConfirmButton, CardTitle, Field, Input, PageHeader, Segmented, Select, Toggle } from "@/components/ui";
import { auth, data } from "@/lib/backend";
import { SAMPLE_PREFIX, clearSampleData, importSampleData } from "@/lib/backend/firestore";
import { resetDemoData } from "@/lib/backend/local";
import { DEPARTMENTS, IS_STATIC_DEMO } from "@/lib/constants";
import { defaultConfig, withDefaults } from "@/lib/notification-config";
import { can } from "@/lib/rbac";
import { newId } from "@/lib/tasks";
import type { ChannelKey, NotificationConfig, WebhookType } from "@/lib/types";

async function api(path: string, body: unknown) {
  const token = await auth.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export default function SettingsPage() {
  const { me, mode, toast } = useApp();
  const owner = can.manageIntegrations(me!);
  const [cfg, setCfg] = useState<NotificationConfig>(defaultConfig());
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (owner) data.getIntegrations().then((c) => setCfg(withDefaults(c))).catch(() => undefined);
  }, [owner]);

  const set = <K extends keyof NotificationConfig>(k: K, p: Partial<NotificationConfig[K]>) => setCfg({ ...cfg, [k]: { ...(cfg[k] as object), ...p } });

  const save = async () => {
    setBusy("save");
    try {
      await data.saveIntegrations(cfg);
      toast("Đã lưu cấu hình tích hợp", "success");
    } catch (e) {
      toast("Lưu lỗi: " + (e as Error).message, "error");
    }
    setBusy(null);
  };

  const test = async (channel: ChannelKey) => {
    setBusy(channel);
    try {
      const { results } = (await api("/api/notifications/test", { channel, config: cfg })) as { results: { channel: string; ok: boolean; error?: string }[] };
      if (!results.length) toast("Kênh này chưa có cấu hình để gửi", "error");
      results.forEach((r) => toast(r.ok ? `${r.channel}: gửi thử thành công` : `${r.channel}: ${r.error}`, r.ok ? "success" : "error"));
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(null);
  };

  const runCron = async (kind: "daily-digest" | "weekly-report") => {
    setBusy(kind);
    try {
      const r = await api(`/api/cron/${kind}`, { config: mode === "demo" ? cfg : undefined });
      setPreview(r.preview);
      const sent = (r.results as { ok: boolean }[]).filter((x) => x.ok).length;
      toast(r.results.length ? `Đã gửi ${sent}/${r.results.length} kênh` : "Chưa bật kênh nào, xem bản xem trước bên dưới", sent === r.results.length ? "success" : "info");
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(null);
  };

  const testBtn = (k: ChannelKey) => (
    <Button size="sm" disabled={!owner || !!busy || IS_STATIC_DEMO} title={IS_STATIC_DEMO ? "Cần máy chủ Vercel để gửi tin" : undefined} onClick={() => test(k)}>
      {busy === k ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Gửi thử
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Cài đặt tích hợp"
        desc={owner ? "Bật kênh nào thì nhắc việc, báo cáo và sự kiện sẽ gửi qua kênh đó." : "Chỉ Quản trị xem và sửa được mã kết nối."}
        actions={
          owner && (
            <Button variant="primary" disabled={!!busy} onClick={save}>
              {busy === "save" && <Loader2 size={16} className="animate-spin" />} Lưu cấu hình
            </Button>
          )
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Profile />

        {owner && (
          <>
            <Channel icon={<MessageCircle size={18} className="text-blue-500" />} title="Zalo" enabled={cfg.zalo.enabled} onToggle={(v) => set("zalo", { enabled: v })} action={testBtn("zalo")}>
              <Segmented value={cfg.zalo.mode} onChange={(v) => set("zalo", { mode: v })} options={[{ value: "bot", label: "Zalo Bot" }, { value: "webhook", label: "Webhook URL" }, { value: "oa", label: "Zalo OA API" }]} />
              {cfg.zalo.mode === "bot" ? (
                <>
                  <Field label="Bot Token" hint="Tạo bot trong Zalo: tìm Zalo Bot Manager, bấm Tạo bot. Token được gửi về tin nhắn Zalo của anh/chị">
                    <Input type="password" value={cfg.zalo.botToken} onChange={(e) => set("zalo", { botToken: e.target.value.trim() })} placeholder="1234567890:abc..." />
                  </Field>
                  <Field label="Người nhận (chat_id)" hint="Tự điền: ai nhắn một tin cho bot sẽ được thêm vào ở lần chạy kế tiếp. Muốn bỏ ai thì xóa mã của người đó">
                    <Input value={cfg.zalo.botChatIds} onChange={(e) => set("zalo", { botChatIds: e.target.value })} placeholder="Để trống, hệ thống tự điền" />
                  </Field>
                </>
              ) : cfg.zalo.mode === "webhook" ? (
                <Field label="Webhook URL" hint="URL nhận JSON {title, text, url}, ví dụ từ Zalo Bot, n8n, Make để đẩy vào nhóm Zalo">
                  <Input value={cfg.zalo.webhookUrl} onChange={(e) => set("zalo", { webhookUrl: e.target.value })} placeholder="https://..." />
                </Field>
              ) : (
                <>
                  <Field label="OA Access Token">
                    <Input type="password" value={cfg.zalo.oaAccessToken} onChange={(e) => set("zalo", { oaAccessToken: e.target.value })} />
                  </Field>
                  <Field label="User ID người nhận" hint="Người đã quan tâm OA, cách nhau dấu phẩy">
                    <Input value={cfg.zalo.oaUserIds} onChange={(e) => set("zalo", { oaUserIds: e.target.value })} />
                  </Field>
                </>
              )}
            </Channel>

            <Channel icon={<Send size={18} className="text-sky-500" />} title="Telegram Bot" enabled={cfg.telegram.enabled} onToggle={(v) => set("telegram", { enabled: v })} action={testBtn("telegram")}>
              <Field label="Bot Token" hint="Tạo bot với @BotFather">
                <Input type="password" value={cfg.telegram.botToken} onChange={(e) => set("telegram", { botToken: e.target.value })} placeholder="123456:ABC-..." />
              </Field>
              <Field label="Chat ID" hint="Cá nhân: số dương. Nhóm: số âm, ví dụ -1001234567890 (thêm bot vào nhóm trước)">
                <Input value={cfg.telegram.chatId} onChange={(e) => set("telegram", { chatId: e.target.value })} />
              </Field>
            </Channel>

            <Channel icon={<Mail size={18} className="text-rose-500" />} title="Email (Resend / SMTP)" enabled={cfg.email.enabled} onToggle={(v) => set("email", { enabled: v })} action={testBtn("email")}>
              <Segmented value={cfg.email.provider} onChange={(v) => set("email", { provider: v })} options={[{ value: "resend", label: "Resend" }, { value: "smtp", label: "SMTP (Gmail, Outlook...)" }]} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Người gửi">
                  <Input value={cfg.email.from} onChange={(e) => set("email", { from: e.target.value })} placeholder="Task Tracker <no-reply@congty.vn>" />
                </Field>
                <Field label="Người nhận" hint="Cách nhau dấu phẩy">
                  <Input value={cfg.email.to} onChange={(e) => set("email", { to: e.target.value })} />
                </Field>
              </div>
              {cfg.email.provider === "resend" ? (
                <Field label="Resend API Key">
                  <Input type="password" value={cfg.email.resendApiKey} onChange={(e) => set("email", { resendApiKey: e.target.value })} placeholder="re_..." />
                </Field>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="SMTP Host">
                    <Input value={cfg.email.smtpHost} onChange={(e) => set("email", { smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
                  </Field>
                  <Field label="Port">
                    <Input value={cfg.email.smtpPort} onChange={(e) => set("email", { smtpPort: e.target.value })} />
                  </Field>
                  <Field label="Tài khoản">
                    <Input value={cfg.email.smtpUser} onChange={(e) => set("email", { smtpUser: e.target.value })} />
                  </Field>
                  <Field label="Mật khẩu ứng dụng">
                    <Input type="password" value={cfg.email.smtpPass} onChange={(e) => set("email", { smtpPass: e.target.value })} />
                  </Field>
                </div>
              )}
            </Channel>

            <Channel icon={<Webhook size={18} className="text-violet-500" />} title="Lark / Slack / Discord / Custom Webhook" action={testBtn("webhooks")}>
              {cfg.webhooks.map((w) => (
                <div key={w.id} className="flex items-center gap-2">
                  <Toggle checked={w.enabled} onChange={(v) => setCfg({ ...cfg, webhooks: cfg.webhooks.map((x) => (x.id === w.id ? { ...x, enabled: v } : x)) })} />
                  <Select className="w-28" value={w.type} onChange={(e) => setCfg({ ...cfg, webhooks: cfg.webhooks.map((x) => (x.id === w.id ? { ...x, type: e.target.value as WebhookType } : x)) })}>
                    <option value="lark">Lark</option>
                    <option value="slack">Slack</option>
                    <option value="discord">Discord</option>
                    <option value="custom">Custom</option>
                  </Select>
                  <Input value={w.url} placeholder="https://..." onChange={(e) => setCfg({ ...cfg, webhooks: cfg.webhooks.map((x) => (x.id === w.id ? { ...x, url: e.target.value } : x)) })} />
                  <button className="p-1 text-ink-soft hover:text-red-600" onClick={() => setCfg({ ...cfg, webhooks: cfg.webhooks.filter((x) => x.id !== w.id) })} aria-label="Xóa webhook">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, webhooks: [...cfg.webhooks, { id: newId(), type: "slack", url: "", enabled: true }] })}>
                <Plus size={14} /> Thêm webhook
              </Button>
            </Channel>

            <Card>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" /> Kịch bản tự động
                </span>
              </CardTitle>
              <div className="space-y-3 p-4">
                <Toggle checked={cfg.events.taskAssigned} onChange={(v) => set("events", { taskAssigned: v })} label="Báo ngay khi có việc mới được giao" />
                <Toggle checked={cfg.events.mention} onChange={(v) => set("events", { mention: v })} label="Báo ngay khi được @nhắc tên" />
                <Toggle checked={cfg.events.statusChange} onChange={(v) => set("events", { statusChange: v })} label="Báo khi việc Hoàn thành hoặc Tạm dừng" />
                <Toggle checked={cfg.events.dailyDigest} onChange={(v) => set("events", { dailyDigest: v })} label="Nhắc việc 8:00 sáng hằng ngày" />
                <Toggle checked={cfg.events.weeklyReport} onChange={(v) => set("events", { weeklyReport: v })} label="Báo cáo tổng kết 20:00 Chủ nhật" />
                <p className="flex items-start gap-1.5 text-xs text-ink-soft">
                  <Bell size={13} className="mt-0.5 shrink-0" /> Chuông thông báo trong app luôn bật cho mọi người.
                </p>
                {IS_STATIC_DEMO && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Nhắc việc 8:00 sáng và báo cáo 20:00 Chủ nhật được gửi tự động qua lịch chạy GitHub (bật Zalo Bot ở trên rồi bấm Lưu). Báo tức thì khi giao việc, nhắc tên hiện ở chuông trong app.</p>}
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button size="sm" disabled={!!busy || IS_STATIC_DEMO} onClick={() => runCron("daily-digest")}>
                    {busy === "daily-digest" && <Loader2 size={14} className="animate-spin" />} Chạy thử nhắc việc sáng
                  </Button>
                  <Button size="sm" disabled={!!busy || IS_STATIC_DEMO} onClick={() => runCron("weekly-report")}>
                    {busy === "weekly-report" && <Loader2 size={14} className="animate-spin" />} Chạy thử báo cáo tuần
                  </Button>
                </div>
                {mode === "demo" && <p className="text-xs text-ink-soft">Bản dùng thử: máy chủ soạn tin từ dữ liệu mẫu, gửi qua các kênh đang nhập trên form.</p>}
                {preview && <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs thin-scroll">{preview}</pre>}
              </div>
            </Card>
          </>
        )}

        {!IS_STATIC_DEMO && <CalendarSync />}

        {mode === "firebase" && owner && <SampleData />}

        {mode === "demo" && (
          <Card>
            <CardTitle>Dữ liệu dùng thử</CardTitle>
            <div className="space-y-3 p-4 text-sm text-ink-soft">
              <p>Dữ liệu đang nằm trong trình duyệt này. Khôi phục để quay lại bộ dữ liệu mẫu tính theo ngày hôm nay.</p>
              <ConfirmButton label={<><RotateCcw size={16} /> Khôi phục dữ liệu mẫu</>} confirmLabel="Bấm lần nữa để xóa mọi thay đổi" onConfirm={() => { resetDemoData(); toast("Đã nạp lại dữ liệu mẫu", "success"); }} />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

/** Owner nạp hoặc xóa bộ khoảng 100 việc mẫu ngành xây dựng trên dữ liệu thật */
function SampleData() {
  const { me, users, tasks, projects, today, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const sampleTasks = tasks.filter((t) => t.id.startsWith(SAMPLE_PREFIX));
  const sampleUsers = users.filter((u) => u.id.startsWith(SAMPLE_PREFIX));
  const sampleProjects = projects.filter((p) => p.id.startsWith(SAMPLE_PREFIX));
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      toast(await fn(), "success");
    } catch (e) {
      toast("Lỗi: " + (e as Error).message, "error");
    }
    setBusy(false);
  };
  return (
    <Card>
      <CardTitle>Dữ liệu mẫu</CardTitle>
      <div className="space-y-3 p-4 text-sm text-ink-soft">
        <p>
          Nạp 3 dự án mẫu (chung cư, nhà xưởng, trường học) với khoảng 130 đầu việc, mốc hợp đồng, sổ chỉ đạo và 12 nhân sự mẫu, để xem thử ngay trên dữ liệu thật. Vai Tổng Giám đốc trong bộ mẫu là anh/chị. Nạp lại sẽ đưa việc mẫu về như ban đầu. Dùng xong bấm Xóa, dữ liệu anh/chị tự tạo vẫn giữ nguyên.
        </p>
        {sampleTasks.length > 0 && <p className="font-medium text-ink">Đang có {sampleProjects.length} dự án mẫu, {sampleTasks.length} việc mẫu, {sampleUsers.length} nhân sự mẫu.</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy} onClick={() => run(async () => `Đã nạp ${await importSampleData(me!.id, today)} việc mẫu`)}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} {sampleTasks.length ? "Nạp lại dữ liệu mẫu" : "Nạp dữ liệu mẫu"}
          </Button>
          {(sampleTasks.length > 0 || sampleUsers.length > 0 || sampleProjects.length > 0) && (
            <ConfirmButton
              disabled={busy}
              label={<><Trash2 size={16} /> Xóa dữ liệu mẫu</>}
              confirmLabel="Bấm lần nữa để xóa hết việc mẫu"
              onConfirm={() => run(async () => (await clearSampleData(sampleTasks.map((t) => t.id), sampleUsers.map((u) => u.id), sampleProjects.map((p) => p.id)), "Đã xóa dữ liệu mẫu"))}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

function Channel({ icon, title, enabled, onToggle, action, children }: { icon: ReactNode; title: string; enabled?: boolean; onToggle?: (v: boolean) => void; action: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardTitle
        action={
          <div className="flex items-center gap-3">
            {action}
            {onToggle && <Toggle checked={!!enabled} onChange={onToggle} />}
          </div>
        }
      >
        <span className="flex items-center gap-2">
          {icon} {title}
        </span>
      </CardTitle>
      <div className="space-y-3 p-4">{children}</div>
    </Card>
  );
}

function Profile() {
  const { me, saveUser, toast } = useApp();
  const [p, setP] = useState({ name: me!.name, title: me!.title ?? "", department: me!.department });
  return (
    <Card>
      <CardTitle>Hồ sơ của tôi</CardTitle>
      <div className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Họ và tên">
            <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          </Field>
          <Field label="Chức danh">
            <Input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
          </Field>
        </div>
        <Field label="Phòng ban" hint={can.manageMembers(me!) ? undefined : "Quản trị đổi phòng ban cho bạn ở trang Thành viên"}>
          <Select value={p.department} disabled={!can.manageMembers(me!)} onChange={(e) => setP({ ...p, department: e.target.value })}>
            {Array.from(new Set([...DEPARTMENTS, p.department])).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
        <Button
          onClick={async () => {
            await saveUser({ ...me!, ...p });
            toast("Đã cập nhật hồ sơ", "success");
          }}
        >
          Lưu hồ sơ
        </Button>
      </div>
    </Card>
  );
}

function CalendarSync() {
  const { me, toast } = useApp();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/calendar/feed?token=<CALENDAR_FEED_TOKEN>&user=${me!.id}`;
  return (
    <Card>
      <CardTitle>
        <span id="calendar" className="flex items-center gap-2">
          <CalendarDays size={18} className="text-emerald-500" /> Đồng bộ Google Calendar
        </span>
      </CardTitle>
      <div className="space-y-3 p-4 text-sm">
        <p className="text-ink-soft">
          Google Calendar → Cài đặt → <b>Thêm lịch → Từ URL</b>, dán link dưới đây (thay token bằng giá trị CALENDAR_FEED_TOKEN). Google tự cập nhật lịch vài giờ một lần. Bỏ <code>&user=...</code> để lấy việc của cả nhóm.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(url).then(() => toast("Đã chép link", "success"), () => toast("Không chép được, hãy bôi đen và chép tay", "error"));
            }}
            aria-label="Chép link"
          >
            <Copy size={16} />
          </Button>
        </div>
        <p className="text-xs text-ink-soft">Muốn nhập một lần: vào trang Lịch biểu, bấm Xuất .ics rồi Nhập (Import) vào Google Calendar.</p>
      </div>
    </Card>
  );
}
