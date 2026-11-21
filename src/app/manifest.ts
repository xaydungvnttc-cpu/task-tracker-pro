import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Task Tracker Pro",
    short_name: "Task Tracker",
    description: "Giao việc, theo dõi tiến độ và nhắc việc đa kênh",
    start_url: "/today",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f7fb",
    theme_color: "#2554e8",
    lang: "vi",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Việc hôm nay", url: "/today" },
      { name: "Kanban", url: "/kanban" },
    ],
  };
}
