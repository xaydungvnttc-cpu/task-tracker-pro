export type Role = "owner" | "manager" | "editor" | "member";
export type TaskStatus = "todo" | "in_progress" | "on_hold" | "done";
export type TimeType = "single" | "multi" | "none";
export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "quarterly";
export type Scope = "all" | "mine" | "team" | "unassigned";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  title?: string;
  color: string; // màu avatar
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string; // ISO datetime
}

export interface Recurrence {
  freq: RecurrenceFreq;
  weekdays?: number[]; // 0 = CN ... 6 = T7, dùng cho weekly
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  watcherIds: string[];
  department: string;
  important: boolean;
  urgent: boolean;
  timeType: TimeType;
  startDate: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  status: TaskStatus;
  checklist: ChecklistItem[];
  inputLinks: LinkItem[];
  outputLinks: LinkItem[];
  requireOutput: boolean;
  recurrence: Recurrence | null;
  /** Đã sinh kỳ kế tiếp chưa (chống sinh trùng) */
  recurrenceSpawned: boolean;
  comments: Comment[];
  completedAt: string | null; // ISO datetime
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export type WebhookType = "lark" | "slack" | "discord" | "custom";

export interface NotificationConfig {
  zalo: { enabled: boolean; mode: "bot" | "webhook" | "oa"; botToken: string; botChatIds: string; webhookUrl: string; oaAccessToken: string; oaUserIds: string };
  telegram: { enabled: boolean; botToken: string; chatId: string };
  email: {
    enabled: boolean;
    provider: "resend" | "smtp";
    from: string;
    to: string;
    resendApiKey: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPass: string;
  };
  webhooks: { id: string; type: WebhookType; url: string; enabled: boolean }[];
  events: { taskAssigned: boolean; mention: boolean; statusChange: boolean; dailyDigest: boolean; weeklyReport: boolean };
}

export type ChannelKey = "zalo" | "telegram" | "email" | "webhooks";

/** Nội dung thông báo trung lập, mỗi kênh tự định dạng lại */
export interface OutgoingMessage {
  title: string;
  sections: { heading?: string; tone?: "red" | "yellow" | "green" | "gray"; lines: string[] }[];
  url?: string;
}

export type NotifyEvent =
  | { type: "taskAssigned"; task: Task; actorName: string; assigneeName: string }
  | { type: "mention"; task: Task; actorName: string; mentionedNames: string[]; text: string }
  | { type: "statusChange"; task: Task; actorName: string; from: TaskStatus; to: TaskStatus };
