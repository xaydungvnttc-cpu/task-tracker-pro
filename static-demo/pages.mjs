// Tạo thư mục static-demo/pages để đăng lên GitHub Pages (miễn phí):
// index.html (app 1 file) + manifest + service worker + icon → cài được lên màn hình chính.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "pages");
mkdirSync(resolve(out, "icons"), { recursive: true });
const body = readFileSync(resolve(here, "dist/task-tracker-pro.html"), "utf8");

writeFileSync(
  resolve(out, "index.html"),
  `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2554e8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Task Tracker">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
</head>
<body style="margin:0">
${body}
<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});</script>
</body>
</html>
`,
);

writeFileSync(
  resolve(out, "manifest.webmanifest"),
  JSON.stringify(
    {
      name: "Task Tracker Pro",
      short_name: "Task Tracker",
      start_url: "./#today",
      scope: "./",
      display: "standalone",
      background_color: "#f5f7fb",
      theme_color: "#2554e8",
      lang: "vi",
      icons: [
        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  ),
);

// Mạng trước, mất mạng thì dùng bản đã lưu
writeFileSync(
  resolve(out, "sw.js"),
  `const C = "ttp-pages-v2";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(["./", "./manifest.webmanifest", "./icons/icon-192.png"]))); });
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(C).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((h) => h || caches.match("./"))));
});
`,
);
for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) copyFileSync(resolve(here, "../public/icons", f), resolve(out, "icons", f));
writeFileSync(resolve(out, ".nojekyll"), "");
console.log("OK → static-demo/pages");
