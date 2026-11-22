import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin cho cron và API. Thiếu biến môi trường thì trả null (chế độ Demo).
 * Hai cách đăng nhập: khóa service account (3 biến FIREBASE_ADMIN_*), hoặc không cần khóa khi GitHub Actions
 * đã đăng nhập Google qua Workload Identity (có GOOGLE_APPLICATION_CREDENTIALS, chỉ cần FIREBASE_ADMIN_PROJECT_ID).
 */
export function getAdmin() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const keyless = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!projectId || (!keyless && (!clientEmail || !privateKey))) return null;
  const credential = clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault();
  const app = getApps()[0] ?? initializeApp({ credential, projectId });
  return { db: getFirestore(app), auth: getAuth(app) };
}
