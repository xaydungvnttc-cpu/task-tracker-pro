"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";
import { Card, CardTitle } from "./ui";
import { loadAiReport } from "@/lib/backend/firestore";
import { formatDateTime } from "@/lib/dates";

/**
 * Nhận định của trợ lý AI mỗi sáng: đọc toàn bộ việc, dự án, rồi viết 5-10 dòng việc Ban TGĐ cần làm hôm nay.
 * Chỉ hiện khi đã bật (có khóa GEMINI_API_KEY trong GitHub); chỉ Owner xem.
 */
export function AiReport() {
  const { me, mode } = useApp();
  const [report, setReport] = useState<{ text: string; createdAt: string } | null>(null);
  useEffect(() => {
    if (mode !== "demo" && me?.role === "owner") loadAiReport().then(setReport);
  }, [mode, me?.role]);
  if (!report) return null;
  return (
    <Card className="mt-5">
      <CardTitle action={<span className="text-xs text-ink-soft">{formatDateTime(report.createdAt)}</span>}>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={16} className="text-violet-600" /> Trợ lý AI nhận định
        </span>
      </CardTitle>
      <div className="whitespace-pre-line px-4 py-3 text-sm leading-relaxed">{report.text}</div>
    </Card>
  );
}
