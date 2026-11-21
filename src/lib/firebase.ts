import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Biến NEXT_PUBLIC_* phải được viết tường minh để Next.js nhúng vào bundle trình duyệt
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Có key Firebase thì chạy Production, không có thì chạy Demo */
export const isFirebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function getFirebase() {
  if (!cached) {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    cached = { app, auth: getAuth(app), db: getFirestore(app) };
  }
  return cached;
}
