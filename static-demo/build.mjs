// Đóng gói bản Demo thành MỘT file HTML tự chạy (không cần máy chủ), để đăng lên link chia sẻ.
// Chạy: node static-demo/build.mjs  → static-demo/dist/task-tracker-pro.html
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = resolve(here, "dist");
mkdirSync(out, { recursive: true });

const firebaseOff = {
  name: "firebase-off",
  setup(b) {
    b.onResolve({ filter: /(^|\/)(firebase|firestore)$/ }, (args) =>
      args.path.startsWith(".") || args.path.startsWith("@/") ? { path: resolve(here, "shims/firebase-off.ts") } : undefined,
    );
  },
};

const js = await build({
  entryPoints: [resolve(here, "entry.tsx")],
  bundle: true,
  minify: process.env.NOMINIFY !== "1",
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  tsconfig: resolve(root, "tsconfig.json"),
  alias: { "next/navigation": resolve(here, "shims/next-navigation.ts"), "next/link": resolve(here, "shims/next-link.tsx") },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_STATIC_DEMO": '"1"',
  },
  plugins: [firebaseOff],
  logLevel: "warning",
});

execSync(`npx @tailwindcss/cli -i ${resolve(here, "styles.css")} -o ${resolve(out, "app.css")} --minify`, { cwd: root, stdio: "inherit" });
const css = readFileSync(resolve(out, "app.css"), "utf8");
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>Task Tracker Pro</title>
<meta name="description" content="Giao việc, theo dõi tiến độ dự án xây dựng">
<style>${css}</style>
<div id="root" class="min-h-dvh font-sans antialiased"></div>
<script>${code}</script>
`;
writeFileSync(resolve(out, "task-tracker-pro.html"), html);
console.log(`OK: ${(html.length / 1024).toFixed(0)} KB → static-demo/dist/task-tracker-pro.html`);
