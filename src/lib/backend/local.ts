"use client";

import { todayISO } from "../dates";
import { buildSeed } from "../seed";
import { newId } from "../tasks";
import { AVATAR_COLORS } from "../constants";
import type { NotificationConfig, User } from "../types";
import type { AuthBackend, DataBackend, Snapshot } from "./types";

/**
 * Chế độ Demo: toàn bộ dữ liệu nằm trong localStorage của trình duyệt.
 * Mở 2 tab cùng lúc vẫn đồng bộ nhờ sự kiện "storage".
 */
const DATA_KEY = "ttp:data:v5";
const SESSION_KEY = "ttp:session";
const CRED_KEY = "ttp:credentials";
const INTEGRATION_KEY = "ttp:integrations";
export const DEMO_PASSWORD = "demo123";

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* bộ nhớ đầy hoặc bị chặn: bỏ qua */
  }
}

function read(): Snapshot {
  const raw = safeGet(DATA_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Snapshot;
    } catch {
      /* hỏng dữ liệu thì seed lại */
    }
  }
  const seed = buildSeed(todayISO());
  safeSet(DATA_KEY, JSON.stringify(seed));
  return seed;
}

function write(mutate: (s: Snapshot) => void) {
  const s = read();
  mutate(s);
  safeSet(DATA_KEY, JSON.stringify(s));
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === DATA_KEY || e.key === SESSION_KEY) emit();
  });
}

export function resetDemoData() {
  safeSet(DATA_KEY, JSON.stringify(buildSeed(todayISO())));
  emit();
}

export const localData: DataBackend = {
  mode: "demo",
  subscribe(userId, cb) {
    const push = () => {
      const s = read();
      cb({ users: s.users, tasks: s.tasks, projects: s.projects ?? [], notifications: s.notifications.filter((n) => n.userId === userId) });
    };
    listeners.add(push);
    push();
    return () => {
      listeners.delete(push);
    };
  },
  async saveTask(t) {
    write((s) => {
      const i = s.tasks.findIndex((x) => x.id === t.id);
      if (i >= 0) s.tasks[i] = t;
      else s.tasks.push(t);
    });
  },
  async deleteTask(id) {
    write((s) => {
      s.tasks = s.tasks.filter((t) => t.id !== id);
    });
  },
  async saveProject(p) {
    write((s) => {
      s.projects = s.projects ?? [];
      const i = s.projects.findIndex((x) => x.id === p.id);
      if (i >= 0) s.projects[i] = p;
      else s.projects.push(p);
    });
  },
  async deleteProject(id) {
    write((s) => {
      s.projects = (s.projects ?? []).filter((p) => p.id !== id);
    });
  },
  async saveUser(u) {
    write((s) => {
      const i = s.users.findIndex((x) => x.id === u.id);
      if (i >= 0) s.users[i] = u;
      else s.users.push(u);
    });
  },
  async addNotifications(list) {
    write((s) => {
      s.notifications.unshift(...list);
      s.notifications = s.notifications.slice(0, 300);
    });
  },
  async markRead(ids) {
    write((s) => {
      s.notifications.forEach((n) => {
        if (ids.includes(n.id)) n.read = true;
      });
    });
  },
  async getIntegrations() {
    const raw = safeGet(INTEGRATION_KEY);
    return raw ? (JSON.parse(raw) as NotificationConfig) : null;
  },
  async saveIntegrations(c) {
    safeSet(INTEGRATION_KEY, JSON.stringify(c));
  },
};

/* ---------------- Đăng nhập Demo ---------------- */

async function hash(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return "plain:" + text; // trình duyệt không có crypto.subtle (http qua IP LAN)
}

function readCreds(): Record<string, { userId: string; hash: string }> {
  try {
    return JSON.parse(safeGet(CRED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function currentUser(): User | null {
  const id = safeGet(SESSION_KEY);
  return id ? (read().users.find((u) => u.id === id) ?? null) : null;
}

export const localAuth: AuthBackend = {
  onChange(cb) {
    const push = () => cb(currentUser());
    listeners.add(push);
    push();
    return () => {
      listeners.delete(push);
    };
  },
  async login(email, password) {
    const key = email.trim().toLowerCase();
    const user = read().users.find((u) => u.email.toLowerCase() === key);
    const cred = readCreds()[key];
    const ok = user && (cred ? cred.hash === (await hash(password)) : password === DEMO_PASSWORD);
    if (!user || !ok) throw new Error("Email hoặc mật khẩu không đúng");
    safeSet(SESSION_KEY, user.id);
    emit();
  },
  async register(name, email, password, department) {
    const key = email.trim().toLowerCase();
    if (read().users.some((u) => u.email.toLowerCase() === key)) throw new Error("Email này đã được đăng ký");
    if (password.length < 6) throw new Error("Mật khẩu cần ít nhất 6 ký tự");
    const user: User = {
      id: newId(),
      name: name.trim(),
      email: key,
      role: "member",
      department,
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    };
    const creds = readCreds();
    creds[key] = { userId: user.id, hash: await hash(password) };
    safeSet(CRED_KEY, JSON.stringify(creds));
    await localData.saveUser(user);
    safeSet(SESSION_KEY, user.id);
    emit();
  },
  async loginGoogle() {
    throw new Error("Đăng nhập Google cần cấu hình Firebase. Xem README mục (b).");
  },
  async loginDemo(userId) {
    read(); // bảo đảm đã có dữ liệu mẫu
    safeSet(SESSION_KEY, userId);
    emit();
  },
  async logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* bỏ qua */
    }
    emit();
  },
  async getIdToken() {
    return null;
  },
};
