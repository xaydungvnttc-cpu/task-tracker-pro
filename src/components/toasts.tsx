"use client";

import clsx from "clsx";
import { useApp } from "./app-provider";

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg",
            t.tone === "error" ? "bg-red-600" : t.tone === "success" ? "bg-emerald-600" : "bg-slate-800",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
