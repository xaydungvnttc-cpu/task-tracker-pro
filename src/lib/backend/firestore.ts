"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FbUser,
} from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, where, writeBatch } from "firebase/firestore";
import { getFirebase } from "../firebase";
import { AVATAR_COLORS, DEPARTMENTS } from "../constants";
import { buildSeed } from "../seed";
import type { AppNotification, NotificationConfig, Task, User } from "../types";
import type { AuthBackend, DataBackend } from "./types";

/**
 * Chế độ Production: Firestore real-time.
 * Cấu trúc: users/{uid}, tasks/{id}, notifications/{id}, settings/integrations, meta/owner
 */

/** Firestore không nhận giá trị undefined */
const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export const firestoreData: DataBackend = {
  mode: "firebase",
  subscribe(userId, cb) {
    const { db } = getFirebase();
    const offs = [
      onSnapshot(collection(db, "users"), (s) => cb({ users: s.docs.map((d) => d.data() as User) })),
      onSnapshot(collection(db, "tasks"), (s) => cb({ tasks: s.docs.map((d) => d.data() as Task) })),
      onSnapshot(query(collection(db, "notifications"), where("userId", "==", userId)), (s) =>
        cb({
          notifications: s.docs.map((d) => d.data() as AppNotification).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        }),
      ),
    ];
    return () => offs.forEach((off) => off());
  },
  async saveTask(t) {
    await setDoc(doc(getFirebase().db, "tasks", t.id), clean(t));
  },
  async deleteTask(id) {
    await deleteDoc(doc(getFirebase().db, "tasks", id));
  },
  async saveUser(u) {
    await setDoc(doc(getFirebase().db, "users", u.id), clean(u));
  },
  async addNotifications(list) {
    const { db } = getFirebase();
    const b = writeBatch(db);
    list.forEach((n) => b.set(doc(db, "notifications", n.id), clean(n)));
    await b.commit();
  },
  async markRead(ids) {
    const { db } = getFirebase();
    const b = writeBatch(db);
    ids.forEach((id) => b.update(doc(db, "notifications", id), { read: true }));
    await b.commit();
  },
  async getIntegrations() {
    const s = await getDoc(doc(getFirebase().db, "settings", "integrations"));
    return s.exists() ? (s.data() as NotificationConfig) : null;
  },
  async saveIntegrations(c) {
    await setDoc(doc(getFirebase().db, "settings", "integrations"), clean(c));
  },
};

/* ---------------- Dữ liệu mẫu trên dữ liệu thật ---------------- */

/** Mọi bản ghi mẫu có mã bắt đầu bằng "mau-" để xóa gọn một lần (kể cả kỳ định kỳ sinh ra sau: "mau-t5~2026-12-04") */
export const SAMPLE_PREFIX = "mau-";

/** Ghi lần lượt từng nhóm 20 bản ghi, tránh dồn quá nhiều yêu cầu cùng lúc */
async function inChunks<T>(items: T[], fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += 20) await Promise.all(items.slice(i, i + 20).map(fn));
}

/**
 * Nạp bộ việc mẫu ngành xây dựng vào Firestore. Người đứng đầu bộ mẫu (u1) chính là Owner đang đăng nhập,
 * 9 nhân sự còn lại là hồ sơ mẫu (không đăng nhập được), Owner giao lại việc cho người thật khi họ vào.
 */
export async function importSampleData(ownerUid: string, today: string): Promise<number> {
  const { db } = getFirebase();
  const seed = buildSeed(today);
  const id = (u: string) => (u === "u1" ? ownerUid : SAMPLE_PREFIX + u);
  const users = seed.users.filter((u) => u.id !== "u1").map((u) => ({ ...u, id: id(u.id), email: "" }));
  const tasks = seed.tasks.map((t) => ({
    ...t,
    id: SAMPLE_PREFIX + t.id,
    assigneeId: t.assigneeId && id(t.assigneeId),
    watcherIds: t.watcherIds.map(id),
    createdBy: id(t.createdBy),
    comments: t.comments.map((c) => ({ ...c, userId: id(c.userId) })),
  }));
  await inChunks(users, (u) => setDoc(doc(db, "users", u.id), clean(u)));
  await inChunks(tasks, (t) => setDoc(doc(db, "tasks", t.id), clean(t)));
  return tasks.length;
}

export async function clearSampleData(taskIds: string[], userIds: string[]) {
  const { db } = getFirebase();
  await inChunks(taskIds, (x) => deleteDoc(doc(db, "tasks", x)));
  await inChunks(userIds, (x) => deleteDoc(doc(db, "users", x)));
}

/**
 * Lần đầu đăng nhập thì tạo hồ sơ. Người đầu tiên của hệ thống thành Owner
 * (ghi kèm meta/owner trong cùng một batch, rules chặn người thứ hai làm vậy).
 */
async function ensureProfile(fb: FbUser, department?: string): Promise<User> {
  const { db } = getFirebase();
  const ref = doc(db, "users", fb.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as User;
  const ownerSnap = await getDoc(doc(db, "meta", "owner"));
  const isFirst = !ownerSnap.exists();
  const user: User = {
    id: fb.uid,
    name: fb.displayName || fb.email?.split("@")[0] || "Thành viên",
    email: fb.email ?? "",
    role: isFirst ? "owner" : "member",
    department: department ?? (isFirst ? DEPARTMENTS[0] : DEPARTMENTS[1]),
    color: AVATAR_COLORS[fb.uid.charCodeAt(0) % AVATAR_COLORS.length],
  };
  const b = writeBatch(db);
  b.set(ref, clean(user));
  if (isFirst) b.set(doc(db, "meta", "owner"), { uid: fb.uid });
  await b.commit();
  return user;
}

let pendingDepartment: string | undefined;

const viMessage = (e: unknown): Error => {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email hoặc mật khẩu không đúng",
    "auth/email-already-in-use": "Email này đã được đăng ký",
    "auth/weak-password": "Mật khẩu cần ít nhất 6 ký tự",
    "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google",
    "auth/too-many-requests": "Thử sai quá nhiều lần, vui lòng đợi ít phút",
  };
  return new Error(map[code] ?? (e as Error)?.message ?? "Có lỗi xảy ra");
};

export const firebaseAuth: AuthBackend = {
  onChange(cb) {
    const { auth, db } = getFirebase();
    let offProfile: (() => void) | null = null;
    const offAuth = onAuthStateChanged(auth, async (fb) => {
      offProfile?.();
      offProfile = null;
      if (!fb) return cb(null);
      try {
        await ensureProfile(fb, pendingDepartment);
        pendingDepartment = undefined;
        // Theo dõi hồ sơ để đổi quyền có hiệu lực ngay
        offProfile = onSnapshot(doc(db, "users", fb.uid), (s) => cb(s.exists() ? (s.data() as User) : null));
      } catch (e) {
        console.error(e);
        cb(null);
      }
    });
    return () => {
      offProfile?.();
      offAuth();
    };
  },
  async login(email, password) {
    try {
      await signInWithEmailAndPassword(getFirebase().auth, email, password);
    } catch (e) {
      throw viMessage(e);
    }
  },
  async register(name, email, password, department) {
    try {
      pendingDepartment = department;
      const cred = await createUserWithEmailAndPassword(getFirebase().auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // onAuthStateChanged có thể chạy trước updateProfile, cập nhật lại tên cho chắc
      const ref = doc(getFirebase().db, "users", cred.user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) await setDoc(ref, { ...snap.data(), name }, { merge: true });
    } catch (e) {
      throw viMessage(e);
    }
  },
  async loginGoogle() {
    try {
      await signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
    } catch (e) {
      throw viMessage(e);
    }
  },
  async loginDemo() {
    throw new Error("Bản Production đã tắt đăng nhập Demo");
  },
  async logout() {
    await signOut(getFirebase().auth);
  },
  async getIdToken() {
    return (await getFirebase().auth.currentUser?.getIdToken()) ?? null;
  },
};
