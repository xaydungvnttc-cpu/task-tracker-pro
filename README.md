# Task Tracker Pro

Web app giao việc và kiểm soát tiến độ cho đội nhóm. Chạy trên điện thoại, iPad, laptop và cài được lên màn hình chính như ứng dụng (PWA).

- **6 phân hệ:** Dashboard KPI, Việc hôm nay, Danh sách việc + việc định kỳ, Ma trận Eisenhower (kéo thả), Kanban (kéo thả), Lịch tháng/tuần dạng thanh Gantt + xuất `.ics` + link đồng bộ Google Calendar.
- **Phân quyền:** Owner, Manager, Editor, Member. Bộ lọc phạm vi Tất cả / Việc của tôi / Đội nhóm / Chưa gán áp dụng cho mọi màn hình.
- **Thông báo đa kênh:** Zalo, Telegram, Email (Resend/SMTP), Lark/Slack/Discord/Custom webhook, chuông trong app. Ba kịch bản: sự kiện tức thì, nhắc việc 8:00 sáng, báo cáo 20:00 Chủ nhật.
- **Hai chế độ:** không có key thì chạy **Demo** (dữ liệu mẫu, lưu trong trình duyệt); điền key Firebase thì chạy **Production** (đăng nhập thật, Firestore real-time).

Công nghệ: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide, dnd-kit, Firebase.

---

## Bản xem thử trực tuyến (1 file HTML)

`node static-demo/build.mjs` đóng gói chế độ Demo thành một file `static-demo/dist/task-tracker-pro.html` tự chạy, không cần máy chủ (định tuyến bằng `#dashboard`, `#kanban`...). Dùng để đăng lên một link chia sẻ. Bản này không gửi được Zalo/Telegram/Email và không có đăng nhập thật; các nút đó được khóa kèm ghi chú.

**Đang chạy tại:** https://xaydungvnttc-cpu.github.io/task-tracker-pro/ (GitHub Pages, nhánh `gh-pages`). Cập nhật: `node static-demo/build.mjs && node static-demo/pages.mjs`, rồi đẩy nội dung `static-demo/pages` lên nhánh `gh-pages`.

## (a) Chạy trên máy

Cần Node.js 20.9 trở lên.

```bash
npm install
npm run dev        # mở http://localhost:3000
```

Bấm **"Đăng nhập nhanh bản Demo (1-Click)"** để vào bằng vai trò Owner, hoặc chọn một người mẫu khác để thử quyền Manager/Editor/Member. Tài khoản mẫu: `an@demo.vn` / `demo123`.

Kiểm tra trước khi deploy:

```bash
npm run typecheck  # kiểm tra kiểu TypeScript
npm run build      # build production
npm start          # chạy bản build (có Service Worker, cài PWA được)
```

Muốn mở thử trên điện thoại cùng mạng Wi-Fi: `npm run dev -- -H 0.0.0.0` rồi vào `http://<IP-máy-tính>:3000`. Lưu ý trình duyệt chỉ cho cài PWA khi chạy HTTPS (hoặc localhost), nên cài thật thì dùng bản deploy Vercel.

## (b) Bật đăng nhập thật bằng Firebase

1. Vào <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started**, bật **Email/Password** và **Google**.
3. **Build → Firestore Database → Create database** (chọn vùng `asia-southeast1`).
4. **Firestore → Rules**: dán nội dung file `firestore.rules` rồi **Publish**.
5. **Project settings → General → Your apps → Web (</>)**: tạo web app, chép 6 giá trị `firebaseConfig`.
6. **Project settings → Service accounts → Generate new private key**: tải file JSON (dùng cho cron và API phía server).
7. Sao chép `.env.example` thành `.env.local` và điền:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ten-du-an.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ten-du-an
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ten-du-an.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Lấy từ file JSON service account
FIREBASE_ADMIN_PROJECT_ID=ten-du-an
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@ten-du-an.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

8. Khởi động lại `npm run dev`. Nút Demo tự ẩn. **Người đăng ký đầu tiên tự thành Owner**, người sau là Member; Owner nâng quyền ở trang **Thành viên**.
9. Khi deploy, thêm tên miền Vercel vào **Authentication → Settings → Authorized domains** để đăng nhập Google chạy được.

## (c) Bật Zalo, Telegram, Email

Có 2 cách, dùng cách nào cũng được:

- **Trên giao diện:** Owner vào **Cài đặt tích hợp**, bật kênh, điền token, bấm **Gửi thử**, rồi **Lưu cấu hình** (Production lưu trong Firestore, chỉ Owner đọc được).
- **Bằng biến môi trường** trong `.env.local` / Vercel (kênh nào có token thì tự bật).

| Kênh | Cần điền | Cách lấy |
|---|---|---|
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Chat với **@BotFather** → `/newbot` lấy token. Thêm bot vào nhóm, nhắn 1 tin, mở `https://api.telegram.org/bot<TOKEN>/getUpdates` để xem `chat.id` (nhóm là số âm). |
| Zalo – Webhook | `ZALO_WEBHOOK_URL` | URL nhận JSON `{title, text, url}`. Zalo chưa có webhook gửi thẳng vào nhóm chat, nên thường dùng Zalo Bot hoặc công cụ trung gian (n8n, Make) để đẩy tiếp vào nhóm. |
| Zalo – OA | `ZALO_OA_ACCESS_TOKEN`, `ZALO_OA_USER_IDS` | Tạo Official Account + ứng dụng tại <https://developers.zalo.me>, lấy Access Token. Người nhận phải đã quan tâm OA; `user_id` lấy từ webhook sự kiện "follow". Access Token OA hết hạn sau ~25 giờ, cần làm mới định kỳ. |
| Email – Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` | Đăng ký <https://resend.com>, xác minh tên miền, tạo API key. |
| Email – SMTP | `EMAIL_PROVIDER=smtp`, `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`, `EMAIL_TO` | Gmail: `smtp.gmail.com`, port 587, mật khẩu là **App password** (bật xác minh 2 bước trước). |
| Lark / Slack / Discord / Custom | `LARK_WEBHOOK_URL`, ... | Tạo Incoming Webhook trong nhóm chat tương ứng. Custom nhận JSON `{title, text, url, sections}`. |

**Ba kịch bản tự động** (bật/tắt từng cái trong Cài đặt tích hợp):

| Kịch bản | Khi nào | Endpoint |
|---|---|---|
| Sự kiện tức thì | Giao việc mới, @nhắc tên trong trao đổi, việc chuyển Hoàn thành/Tạm dừng | `POST /api/notifications/dispatch` |
| Nhắc việc sáng | 8:00 hằng ngày: quá hạn (đỏ), đến hạn hôm nay (vàng), 3 ngày tới | `/api/cron/daily-digest` |
| Báo cáo tuần | 20:00 Chủ nhật: số việc xong, tỷ lệ đúng hạn, tồn đọng, kế hoạch tuần mới | `/api/cron/weekly-report` |

Nút **Chạy thử nhắc việc sáng / báo cáo tuần** trong Cài đặt hiển thị đúng nội dung sẽ gửi. Cron cũng tự sinh kỳ mới cho việc định kỳ khi không ai mở app.

Ví dụ nội dung nhắc việc sáng gửi vào nhóm Telegram:

```
☀️ Nhắc việc ngày 21/11/2026

🔴 Quá hạn (2)
• Sửa máy bơm bê tông số 2 · Đỗ Quang Huy · hạn 19/11 · trễ 2 ngày
• Lập hồ sơ thanh toán đợt 3 gửi Chủ đầu tư · Võ Thị Hà · hạn 20/11 · trễ 1 ngày

🟡 Đến hạn hôm nay (2)
• Nghiệm thu cốt thép sàn tầng 5 khối A · Phạm Minh Dũng · hạn 21/11
```

## (d) Deploy lên Vercel

1. Đưa mã lên GitHub.
2. Vào <https://vercel.com/new>, chọn repo → **Deploy** (Vercel tự nhận Next.js).
3. **Settings → Environment Variables**: dán các biến trong `.env.local`, thêm:
   - `NEXT_PUBLIC_APP_URL=https://ten-app.vercel.app` (link trong tin nhắn)
   - `CRON_SECRET=<chuỗi ngẫu nhiên dài>` (Vercel Cron tự gửi kèm, người ngoài không gọi được)
   - `CALENDAR_FEED_TOKEN=<chuỗi ngẫu nhiên>` (bảo vệ link lịch)
4. **Redeploy**. File `vercel.json` đã khai báo 2 cron theo giờ UTC:
   - `0 1 * * *` = 8:00 sáng giờ Việt Nam
   - `0 13 * * 0` = 20:00 Chủ nhật giờ Việt Nam
5. Thêm tên miền Vercel vào Firebase Authorized domains (mục b.9).

Gói Hobby của Vercel cho chạy cron tối đa 1 lần/ngày mỗi job, đủ cho 2 job trên; giờ chạy có thể lệch trong vòng 1 tiếng.

**Đồng bộ Google Calendar:** Google Calendar → Cài đặt → Thêm lịch → **Từ URL**, dán
`https://ten-app.vercel.app/api/calendar/feed?token=<CALENDAR_FEED_TOKEN>&user=<id-của-bạn>` (link có sẵn trong Cài đặt tích hợp). Đây là đồng bộ một chiều từ app sang Google, Google tự làm mới vài giờ một lần.

**Cài lên điện thoại/iPad:** mở link bằng Safari (iOS) → Chia sẻ → **Thêm vào MH chính**; Chrome (Android) → menu → **Cài đặt ứng dụng**.

---

## Cấu trúc mã

```
src/
  app/
    login/                 Đăng nhập, đăng ký, 1-Click Demo
    (app)/                 Khung app (thanh bên, header, bộ lọc phạm vi, chuông)
      dashboard/ today/ tasks/ matrix/ kanban/ calendar/ members/ settings/
    api/
      notifications/dispatch, notifications/test
      cron/daily-digest, cron/weekly-report
      calendar/feed
    manifest.ts            PWA manifest
  components/
    app-provider.tsx       Trạng thái chung + mọi quy tắc nghiệp vụ khi lưu task
    ui.tsx                 Hệ thống thiết kế dùng chung (Button, Card, Badge, Drawer...)
    drag-board.tsx         Bảng kéo thả dùng chung cho Kanban và Eisenhower
    task-card.tsx, task-drawer.tsx
  lib/
    tasks.ts               Tính quá hạn, tiến độ, việc định kỳ, thống kê
    rbac.ts                Phân quyền (firestore.rules áp lại phía server)
    backend/local.ts       Lưu trữ chế độ Demo (localStorage)
    backend/firestore.ts   Lưu trữ chế độ Production (Firestore + Firebase Auth)
    server/                NotificationService, nội dung tin, cron, xác thực API
public/sw.js               Service Worker
firestore.rules            Quy tắc bảo mật Firestore
vercel.json                Lịch cron
```

**Quy tắc việc định kỳ:** mỗi việc định kỳ sinh đúng một kỳ kế tiếp, khi nó được Hoàn thành hoặc khi kỳ kế tiếp đã tới. Nghỉ nhiều ngày không bị sinh dồn: app nhảy thẳng tới kỳ chứa hôm nay. Mã kỳ mới cố định theo hạn chót nên 2 máy cùng sinh cũng không bị trùng.

**Bàn giao bắt buộc:** bật "Bắt buộc có link kết quả khi Hoàn thành" thì không chuyển được sang Hoàn thành (ở mọi màn hình, kể cả kéo thả) khi chưa dán link Output.
