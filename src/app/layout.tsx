import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import { PwaRegister } from "@/components/pwa-register";
import { Toasts } from "@/components/toasts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Tracker Pro",
  description: "Giao việc, theo dõi tiến độ và nhắc việc đa kênh cho đội nhóm",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Task Tracker", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2554e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh font-sans antialiased">
        <AppProvider>
          {children}
          <Toasts />
        </AppProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
