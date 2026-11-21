import "server-only";
import type { User } from "../types";
import { getAdmin } from "./admin";

/**
 * Ai được gọi API:
 * - Demo (không có Firebase Admin): mở, để trải nghiệm ngay.
 * - Production: phải có Firebase ID token hợp lệ (người đã đăng nhập).
 */
export async function currentUser(req: Request): Promise<User | "demo" | null> {
  const admin = getAdmin();
  if (!admin) return "demo";
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    const { uid } = await admin.auth.verifyIdToken(token);
    const snap = await admin.db.doc(`users/${uid}`).get();
    return snap.exists ? (snap.data() as User) : null;
  } catch {
    return null;
  }
}

/** Cron: Vercel gửi "Authorization: Bearer <CRON_SECRET>". Owner bấm "Chạy thử" trên giao diện cũng được. */
export async function cronAllowed(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const u = await currentUser(req);
  if (u === "demo") return !secret || req.method === "POST";
  return u?.role === "owner";
}
