"use client";

import { useEffect } from "react";

/** Chỉ đăng ký Service Worker ở bản build, để lúc phát triển không bị cache cũ */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Đăng ký Service Worker lỗi", e));
  }, []);
  return null;
}
