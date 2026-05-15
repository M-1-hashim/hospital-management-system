---
Task ID: 1
Agent: Main Agent
Task: عمیق بررسی و رفع باگ‌های بخش‌های نوبت‌دهی و لاگ حسابرسی

Work Log:
- بررسی کامل ساختار پروژه (26 API route, 14 page components, Prisma schema)
- تست API routes با curl و کشف باگ‌ها
- شناسایی 3 باگ بحرانی:
  1. API call_next بدون id خطای 400 برمی‌گرداند
  2. دکمه Call Next وقتی بیماری منتظر هست غیرفعال است
  3. نوع onCallNext در QueueDisplay اشتباه است
- اصلاح src/app/api/queue/route.ts — call_next حالا department را از body می‌پذیرد
- اصلاح src/components/hms/shared/QueueDisplay.tsx — دکمه Call Next وقتی بیمار منتظر است فعال می‌شود
- اصلاح src/components/hms/pages/QueuePage.tsx — handleCallNext department ارسال می‌کند
- تست نهایی: build بدون خطا، تمام API tests پاس شد

Stage Summary:
- 3 فایل اصلاح شد: queue/route.ts, QueueDisplay.tsx, QueuePage.tsx
- AppLayout.tsx و AuditLogPage.tsx از قبل درست بودند
- بخش حسابرسی (AuditLog) بدون مشکل کار می‌کند
