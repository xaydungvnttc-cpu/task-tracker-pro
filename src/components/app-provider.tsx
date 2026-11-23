"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { auth, data } from "@/lib/backend";
import { todayISO, nowISO } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { STATUS_LABEL } from "@/lib/constants";
import { applyProject, visibleProjects, visibleTasks } from "@/lib/projects";
import { applyScope, buildNextInstance, findMentions, newId, shouldSpawn } from "@/lib/tasks";
import type { AppNotification, NotifyEvent, Project, Scope, Task, TaskStatus, User } from "@/lib/types";

interface Toast {
  id: string;
  text: string;
  tone: "info" | "error" | "success";
}

interface AppState {
  ready: boolean;
  mode: "demo" | "firebase";
  me: User | null;
  users: User[];
  tasks: Task[];
  projects: Project[];
  /** Dự án đang chọn ở thanh trên cùng: "all" = cả công ty, "office" = khối văn phòng, hoặc id dự án */
  projectFilter: string;
  setProjectFilter: (id: string) => void;
  projectById: (id: string | null | undefined) => Project | undefined;
  saveProject: (p: Project) => Promise<boolean>;
  deleteProject: (p: Project) => Promise<void>;
  /** Task đã lọc theo phạm vi và dự án đang chọn: mọi màn hình dùng danh sách này */
  scoped: Task[];
  notifications: AppNotification[];
  today: string;
  scope: Scope;
  setScope: (s: Scope) => void;
  userById: (id: string | null | undefined) => User | undefined;
  // Ngăn kéo chi tiết task
  drawer: { taskId: string | null; isNew: boolean; preset?: Partial<Task> } | null;
  openTask: (id: string) => void;
  newTask: (preset?: Partial<Task>) => void;
  closeDrawer: () => void;
  // Nghiệp vụ
  saveTask: (next: Task) => Promise<boolean>;
  setStatus: (t: Task, status: TaskStatus) => Promise<boolean>;
  setPriority: (t: Task, important: boolean, urgent: boolean) => Promise<boolean>;
  toggleChecklist: (t: Task, itemId: string) => Promise<void>;
  addComment: (t: Task, text: string) => Promise<void>;
  deleteTask: (t: Task) => Promise<void>;
  saveUser: (u: User) => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  toast: (text: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp phải nằm trong AppProvider");
  return v;
}

const SCOPE_KEY = "ttp:scope";
const PROJECT_KEY = "ttp:project";

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authMe, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  // Hồ sơ mới nhất từ danh sách người dùng (ví dụ vừa liên kết Zalo), không dùng bản cũ lúc đăng nhập
  const me = useMemo(() => (authMe ? (users.find((u) => u.id === authMe.id) ?? authMe) : null), [authMe, users]);
  const [allTasks, setTasks] = useState<Task[]>([]);
  const [allProjects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilterState] = useState("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [scope, setScopeState] = useState<Scope>("all");
  const [drawer, setDrawer] = useState<AppState["drawer"]>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [today, setToday] = useState(todayISO());

  // Qua nửa đêm thì "hôm nay" tự đổi
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SCOPE_KEY) as Scope | null;
      if (s) setScopeState(s);
      const pf = localStorage.getItem(PROJECT_KEY);
      if (pf) setProjectFilterState(pf);
    } catch {
      /* bỏ qua */
    }
  }, []);

  const setScope = useCallback((s: Scope) => {
    setScopeState(s);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch {
      /* bỏ qua */
    }
  }, []);

  const setProjectFilter = useCallback((id: string) => {
    setProjectFilterState(id);
    try {
      localStorage.setItem(PROJECT_KEY, id);
    } catch {
      /* bỏ qua */
    }
  }, []);

  useEffect(
    () =>
      auth.onChange((u) => {
        setMe(u);
        setReady(true);
      }),
    [],
  );

  useEffect(() => {
    if (!me || me.pending) return;
    return data.subscribe(me.id, (p) => {
      if (p.users) setUsers(p.users);
      if (p.tasks) setTasks(p.tasks);
      if (p.projects) setProjects(p.projects);
      if (p.notifications) setNotifications(p.notifications);
    });
  }, [me?.id, me?.pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = newId();
    setToasts((ts) => [...ts, { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000);
  }, []);

  const userById = useCallback((id: string | null | undefined) => users.find((u) => u.id === id), [users]);
  // Mỗi người chỉ thấy dự án mình tham gia (Ban TGĐ thấy tất cả), xem src/lib/projects.ts
  const projects = useMemo(() => visibleProjects(allProjects, me), [allProjects, me]);
  const tasks = useMemo(() => visibleTasks(allTasks, allProjects, me), [allTasks, allProjects, me]);
  const projectById = useCallback((id: string | null | undefined) => (id ? allProjects.find((p) => p.id === id) : undefined), [allProjects]);

  const saveProject = useCallback(
    async (p: Project) => {
      const prev = allProjects.find((x) => x.id === p.id);
      const allowed = !!me && (can.manageProjects(me) || (!!prev && can.editProject(me, prev) && prev.directorId === p.directorId && prev.siteManagerId === p.siteManagerId));
      if (!allowed) {
        toast("Chỉ Quản trị, Quản lý (hoặc GĐDA, CHT với dự án mình, trừ việc đổi GĐDA, CHT) được sửa dự án", "error");
        return false;
      }
      try {
        await data.saveProject(p);
        return true;
      } catch (e) {
        toast("Lưu dự án lỗi: " + (e as Error).message, "error");
        return false;
      }
    },
    [me, toast, allProjects],
  );

  const deleteProject = useCallback(
    async (p: Project) => {
      if (!me || !can.manageProjects(me)) return;
      const n = allTasks.filter((t) => t.projectId === p.id).length;
      if (n) return toast(`Dự án còn ${n} việc. Muốn ẩn dự án thì đổi trạng thái sang Đã bàn giao`, "error");
      await data.deleteProject(p.id);
      toast("Đã xóa dự án", "success");
    },
    [me, tasks, toast],
  );

  /* ---------- Thông báo ---------- */

  /** Gửi ra kênh ngoài qua API. Không chặn giao diện nếu lỗi. */
  const dispatchExternal = useCallback(async (event: NotifyEvent) => {
    try {
      const token = await auth.getIdToken();
      // Bản Demo không có Firestore phía server nên gửi kèm cấu hình đã lưu trên trình duyệt
      const config = data.mode === "demo" ? await data.getIntegrations() : undefined;
      await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ event, config }),
      });
    } catch (e) {
      console.warn("Gửi thông báo ngoài thất bại", e);
    }
  }, []);

  const notifyInApp = useCallback(
    async (userIds: (string | null | undefined)[], title: string, body: string, taskId: string) => {
      const ids = Array.from(new Set(userIds.filter((x): x is string => !!x && x !== me?.id)));
      if (!ids.length) return;
      const createdAt = nowISO();
      await data.addNotifications(ids.map((userId) => ({ id: newId(), userId, title, body, taskId, read: false, createdAt })));
    },
    [me?.id],
  );

  /* ---------- Lưu task: toàn bộ quy tắc nghiệp vụ nằm ở đây ---------- */

  const saveTask = useCallback(
    async (next: Task): Promise<boolean> => {
      if (!me) return false;
      const prev = tasks.find((t) => t.id === next.id);
      if (prev ? !can.updateProgress(me, prev, projectById(prev.projectId)) : !can.createTask(me)) {
        toast("Bạn không có quyền thực hiện thao tác này", "error");
        return false;
      }
      // GĐDA, CHT chỉ điều hành việc trong dự án mình, không chuyển việc sang dự án khác
      if (prev && next.projectId !== prev.projectId && !can.assignOthers(me) && !(prev.createdBy === me.id && me.role === "editor")) {
        toast("Chỉ Quản trị hoặc Quản lý được chuyển việc sang dự án khác", "error");
        return false;
      }
      // Mọi việc phải có bằng chứng hoàn thành. Ví dụ: "Nghiệm thu cốt thép sàn 6" cần link biên bản nghiệm thu, ảnh hiện trường
      if (next.status === "done" && prev?.status !== "done" && next.outputLinks.length === 0) {
        toast("Cần thêm ít nhất 1 link kết quả (biên bản, ảnh, file) trước khi Hoàn thành", "error");
        if (prev) setDrawer({ taskId: prev.id, isNew: false });
        return false;
      }
      const now = nowISO();
      const t: Task = {
        ...next,
        completedAt: next.status === "done" ? (prev?.status === "done" ? prev.completedAt : now) : null,
        updatedAt: now,
        createdAt: prev?.createdAt ?? now,
        createdBy: prev?.createdBy ?? me.id,
      };
      try {
        await data.saveTask(t);
      } catch (e) {
        toast("Lưu thất bại: " + (e as Error).message, "error");
        return false;
      }

      const assignee = userById(t.assigneeId);
      if (t.assigneeId && t.assigneeId !== prev?.assigneeId && assignee) {
        await notifyInApp([t.assigneeId], "Bạn được giao việc mới", `${me.name} giao: ${t.title}`, t.id);
        if (t.assigneeId !== me.id) dispatchExternal({ type: "taskAssigned", task: t, actorName: me.name, assigneeName: assignee.name });
      }
      if (prev && prev.status !== t.status) {
        await notifyInApp(
          [t.assigneeId, t.createdBy, ...t.watcherIds],
          `Trạng thái: ${STATUS_LABEL[t.status]}`,
          `${me.name} chuyển "${t.title}" sang ${STATUS_LABEL[t.status]}`,
          t.id,
        );
        // Chỉ bắn kênh ngoài cho thay đổi quan trọng
        if (t.status === "done" || t.status === "on_hold")
          dispatchExternal({ type: "statusChange", task: t, actorName: me.name, from: prev.status, to: t.status });
      }
      if (!prev) toast("Đã tạo việc", "success");
      return true;
    },
    [me, tasks, toast, userById, notifyInApp, dispatchExternal, projectById],
  );

  // Việc định kỳ: khi xong hoặc tới kỳ thì sinh kỳ mới (người có quyền cập nhật mới chạy, tránh ghi thừa)
  const spawning = useRef(new Set<string>());
  useEffect(() => {
    if (!me) return;
    for (const t of tasks) {
      if (!shouldSpawn(t, today) || spawning.current.has(t.id) || !can.updateProgress(me, t)) continue;
      const next = buildNextInstance(t, today);
      if (!next) continue;
      spawning.current.add(t.id);
      Promise.all([data.saveTask({ ...t, recurrenceSpawned: true }), data.saveTask(next)]).catch((e) => console.warn("Sinh việc định kỳ lỗi", e));
    }
  }, [tasks, today, me]);

  const setStatus = useCallback((t: Task, status: TaskStatus) => saveTask({ ...t, status }), [saveTask]);

  const setPriority = useCallback(
    (t: Task, important: boolean, urgent: boolean) => {
      if (!me || !can.editTask(me, t, projectById(t.projectId))) {
        toast("Chỉ người có quyền sửa việc mới đổi được độ ưu tiên", "error");
        return Promise.resolve(false);
      }
      return saveTask({ ...t, important, urgent });
    },
    [me, saveTask, toast, projectById],
  );

  const toggleChecklist = useCallback(
    async (t: Task, itemId: string) => {
      await saveTask({ ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) });
    },
    [saveTask],
  );

  const addComment = useCallback(
    async (t: Task, text: string) => {
      if (!me || !text.trim()) return;
      const c = { id: newId(), userId: me.id, text: text.trim(), createdAt: nowISO() };
      await data.saveTask({ ...t, comments: [...t.comments, c], updatedAt: c.createdAt });
      const mentioned = findMentions(c.text, users).filter((u) => u.id !== me.id);
      if (mentioned.length) {
        await notifyInApp(mentioned.map((u) => u.id), "Bạn được nhắc tên", `${me.name}: ${c.text.slice(0, 120)}`, t.id);
        dispatchExternal({ type: "mention", task: t, actorName: me.name, mentionedNames: mentioned.map((u) => u.name), text: c.text });
      }
    },
    [me, users, notifyInApp, dispatchExternal],
  );

  const deleteTask = useCallback(
    async (t: Task) => {
      if (!me || !can.deleteTask(me)) return toast("Chỉ Quản trị hoặc Quản lý được xóa việc", "error");
      await data.deleteTask(t.id);
      setDrawer(null);
      toast("Đã xóa việc", "success");
    },
    [me, toast],
  );

  const saveUser = useCallback(async (u: User) => {
    await data.saveUser(u);
  }, []);

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length) await data.markRead(ids);
  }, []);

  // Dự án đang chọn đã bị xóa thì quay về cả công ty
  const pf = projectFilter === "all" || projectFilter === "office" || projects.some((p) => p.id === projectFilter) ? projectFilter : "all";
  const scoped = useMemo(() => applyProject(applyScope(tasks, scope, me), pf), [tasks, scope, me, pf]);

  const value: AppState = {
    ready,
    mode: data.mode,
    me,
    users,
    tasks,
    projects,
    projectFilter: pf,
    setProjectFilter,
    projectById,
    saveProject,
    deleteProject,
    scoped,
    notifications,
    today,
    scope,
    setScope,
    userById,
    drawer,
    openTask: (id) => setDrawer({ taskId: id, isNew: false }),
    newTask: (preset) => setDrawer({ taskId: null, isNew: true, preset }),
    closeDrawer: () => setDrawer(null),
    saveTask,
    setStatus,
    setPriority,
    toggleChecklist,
    addComment,
    deleteTask,
    saveUser,
    markRead,
    toast,
    toasts,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
