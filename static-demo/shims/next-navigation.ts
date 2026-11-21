import { useSyncExternalStore } from "react";

/**
 * Thay next/navigation cho bản Demo tĩnh: định tuyến bằng #hash
 * (trình xem claude.ai chỉ giữ được #ten-don, không giữ đường dẫn).
 * Ví dụ: /dashboard ↔ #dashboard, /settings ↔ #cai-dat
 */
const RESERVED: Record<string, string> = { "/settings": "cai-dat" };

export function pathToHash(path: string): string {
  const clean = path.split("#")[0].split("?")[0];
  return RESERVED[clean] ?? clean.replace(/^\//, "");
}

export function hashToPath(hash: string): string {
  const h = hash.replace(/^#\/?/, ""); // nhận cả #today và #/today (link trong tin Zalo)
  if (!h) return "/dashboard";
  const found = Object.entries(RESERVED).find(([, v]) => v === h);
  return found ? found[0] : "/" + h;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => hashToPath(window.location.hash), () => "/dashboard");
}

const go = (path: string) => {
  window.location.hash = pathToHash(path);
};

export function useRouter() {
  return { push: go, replace: go, back: () => history.back(), refresh: () => undefined, prefetch: () => undefined };
}

export function redirect(path: string): never {
  go(path);
  throw new Error("redirect");
}
