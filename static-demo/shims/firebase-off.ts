/** Bản Demo tĩnh không dùng Firebase: thay module thật để không đóng gói thư viện Firebase */
export const isFirebaseEnabled = false;
export const firebaseConfig = {};
export const firestoreData = null as never;
export const firebaseAuth = null as never;
export function getFirebase(): never {
  throw new Error("Firebase tắt trong bản Demo tĩnh");
}
