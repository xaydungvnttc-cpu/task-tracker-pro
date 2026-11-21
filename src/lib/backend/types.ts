import type { AppNotification, NotificationConfig, Task, User } from "../types";

export interface Snapshot {
  users: User[];
  tasks: Task[];
  notifications: AppNotification[];
}

/**
 * Lớp lưu trữ. Chỉ đọc/ghi, không chứa nghiệp vụ.
 * Có 2 bản cài đặt cùng giao diện: localStorage (Demo) và Firestore (Production).
 */
export interface DataBackend {
  mode: "demo" | "firebase";
  subscribe(userId: string, cb: (patch: Partial<Snapshot>) => void): () => void;
  saveTask(t: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
  saveUser(u: User): Promise<void>;
  addNotifications(list: AppNotification[]): Promise<void>;
  markRead(ids: string[]): Promise<void>;
  getIntegrations(): Promise<NotificationConfig | null>;
  saveIntegrations(c: NotificationConfig): Promise<void>;
}

export interface AuthBackend {
  onChange(cb: (u: User | null) => void): () => void;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string, department: string): Promise<void>;
  loginGoogle(): Promise<void>;
  loginDemo(userId: string): Promise<void>;
  logout(): Promise<void>;
  getIdToken(): Promise<string | null>;
}
