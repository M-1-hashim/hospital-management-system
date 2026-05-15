---
Task ID: 1
Agent: Main Agent
Task: Check and fix the waiting queue section at the bottom of the dashboard

Work Log:
- Read DashboardPage.tsx (680 lines) to find the Queue Widget section
- Read queue API route, QueueDisplay.tsx, QueuePage.tsx, voice-announce.ts for context
- Identified 4 bugs in the dashboard queue widget:
  1. Missing `calledAt` field in QueueEntry type — can't show when patient was called
  2. No department labels on queue entries — mixed departments shown without distinction
  3. Only first "called" patient shown — multiple called patients from different departments hidden
  4. `queueWaiting` stat count included ALL queues, not just waiting ones
- Applied fixes to DashboardPage.tsx:
  1. Added `calledAt?: string | null` to QueueEntry interface
  2. Fixed `queueWaiting` stat to filter only waiting status
  3. Completely rewrote Queue Widget section with 3-column layout:
     - Column 1: All called patients with department badge + called time
     - Column 2: Up to 5 waiting patients with department badges
     - Column 3: Stats summary + navigate button

Stage Summary:
- Fixed DashboardPage.tsx with improved queue widget
- File saved to: /home/z/my-project/download/DashboardPage.tsx
- Key changes: calledAt support, department labels, multi-called display, accurate waiting count
