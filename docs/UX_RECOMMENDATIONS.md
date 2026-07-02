# UX Recommendations — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 (Senior UX Researcher)
**Scope:** Workflows across all 13 roles. Goal: fewer clicks, clearer flows, fewer dead-ends, expert-friendly shortcuts.

Format per workflow:

```
### Current Experience
### Problems
### Recommended Experience
### Expected Benefits
```

Task IDs `[U-NN]` map to `DEEPSEEK_UI_TASKS.md`.

---

## §1 — Student Registration (Registrar / Admin)

### Current Experience
`admin/students/register` (423 lines) and `registrar/students/new` (383 lines) present a single long form: identity, demographic, guardian, academic placement, medical, documents, photo — all in one card, validated on submit.

### Problems
- One ~25-field form → high abandonment and input errors.
- Submit-time validation means users discover all errors at the end.
- Guardian/parent creation is coupled to student creation; if a parent already exists (by phone/national ID), the flow doesn't auto-match — duplicate parents get created.
- No "save draft" — a network blip loses everything.
- No way to generate QR/NFC in the same flow (separate pages).

### Recommended Experience
- **3-step wizard**: (1) Student identity → (2) Guardian (with smart-match: type phone/national ID → suggests existing parent) → (3) Academic placement + optional QR/NFC + photo.
- Inline validation per field; sticky step indicator; "Back" preserves state.
- On guardian step, fetch `/parents/smart-search?q=` debounced; let user pick existing or "create new".
- Draft autosave to `localStorage` per `draft:student:<school>`; prompt to resume on return.
- Success screen shows the generated `student_id` with "Print ID card" + "Add another" actions.

### Expected Benefits
~40% faster registrations, fewer duplicate parents, fewer invalid records, recoverable from interruptions. Registrars typically do dozens/day — this is the highest-value workflow fix.
**Task:** [U-09]

---

## §2 — Invoice Creation & Payment (Finance)

### Current Experience
Create fee type → fee structure → fee assignment → invoice → record payment. Each is a separate page and a separate round-trip. Payments require a client-supplied `idempotency_key` (finance.py:131).

### Problems
- 5 hops to bill a student; high click count.
- The required `idempotency_key` leaks into the UX — if the form doesn't generate one, the call 400s.
- No "invoice → take payment" shortcut; you leave the invoice page to go record a payment.
- No partial-payment guidance; the over-payment guard is server-side only.

### Recommended Experience
- A single **Billing workspace**: pick student → see outstanding fees → check fees to invoice → generate invoice → optional "Take payment now" inline modal showing balance due, suggested amount = total, with the idempotency key generated client-side (`crypto.randomUUID()`).
- Show running balance and remaining-due live as the payment amount is typed.
- One-click "Mark as sent" + email/SMS preview.

### Expected Benefits
Billing a student drops from ~5 screens to 1; fewer double-payments; clearer money state.
**Task:** [U-23]

---

## §3 — Parent Experience (Mobile, Cloud)

### Current Experience
Parent logs into the cloud portal → dashboard with a horizontal child switcher → KPIs (attendance, wallet), recent grades, fees/invoices. Navigates to `/parent/payments` to pay an invoice.

### Problems
- `/parent-portal/payments` is currently **broken server-side** (backend Task-04 signature drift) — parents will hit 500s. (Fix is backend; UX must surface a clear error, not a white screen.)
- No "Pay all outstanding" shortcut; each invoice is separate.
- Wallet top-up flow is not visible from the invoice ("insufficient wallet" should offer a top-up inline).
- Child switcher uses `initials`/`name` fields that the API doesn't return (`full_name` is used elsewhere) — likely showing "—".

### Recommended Experience
- A combined **"What you owe" card** with a single "Pay ETB X" button covering all due invoices (Chapa); on insufficient wallet, inline "Top up ETB Y" then pay.
- Child switcher keyed off `full_name`/`student_id` robustly; show photo.
- Optimistic states: paying → success → updated balance with no full reload.

### Expected Benefits
Parents (the least technical users) get a 2-tap payment path; trust and on-time collection improve.
**Task:** [U-13], [U-23] (and backend Task-04)

---

## §4 — Teacher Daily Workflow (Attendance + Grades)

### Current Experience
Teacher opens dashboard → "Attendance" → picks class → marks → "Gradebook" → picks exam → enters scores. Timetable and "today's classes" are separate.

### Problems
- A teacher's day is class-by-class; the dashboard doesn't surface "Your next class: Grade 10B — Math, Room 204, in 12 min → Take attendance".
- Attendance and grade entry are disconnected from the timetable entry the teacher is actually in.

### Recommended Experience
- **"Today" widget** on the teacher dashboard: today's periods as cards, each with "Take attendance" / "Enter grades" actions scoped to that class+subject.
- Attendance grid optimized for rapid entry: default all-present, tap to mark absent/late; keyboard shortcuts (A/L/P); autosaves per row.
- Grade entry as a spreadsheet-like grid with tab navigation and inline validation against `max_score`.

### Expected Benefits
Teachers spend less time navigating and more time teaching; attendance completion rate rises.
**Task:** [U-24]

---

## §5 — Finance Month-End Close

### Current Experience
Finance user reconciles manually: trial balance, outstanding receivables, payroll approval, period lock — each on separate pages, no guided sequence.

### Problems
- No checklist; easy to forget payroll approval before locking the period.
- Period lock is one-way except for SUPER_ADMIN unlock.

### Recommended Experience
- A **"Month-end checklist"** card: (1) All payments reconciled ✓, (2) Payroll approved ✓, (3) Trial balance balanced ✓, (4) Lock period →. Each item deep-links to its page and shows live status.
- Lock shows a confirmation modal summarizing what gets frozen.

### Expected Benefits
Deterministic close; fewer unlock requests to super-admin.
**Task:** [U-12]

---

## §6 — Super Admin Oversight

### Current Experience
Super-admin dashboard shows school count, license count, revenue, system health — currently mocked.

### Problems
- Numbers are static (trust).
- No drill-down from "3 expired licenses" to the actual licenses.

### Recommended Experience
- Every KPI is a link to a filtered list ("3 licenses expiring in 7 days" → `/super-admin/licenses?status=expiring`).
- A system-health panel pulls real `/health` + sync queue depth + license-server reachability.

### Expected Benefits
Super-admin can act in one click instead of hunting.
**Task:** [U-02]

---

## §7 — Global Search & Command

### Current Experience
⌘K searches page nav only.

### Problems
- Can't find "the invoice for Abebe" or "school in Bahir Dar" without browsing.

### Recommended Experience
- Extend ⌘K to (a) pages, (b) quick actions, (c) **record search** (students/parents/invoices by name/ID) via a debounced server query with a 200ms cap and min-2-char threshold.
- Recent items pinned to top.

### Expected Benefits
Power users become dramatically faster; matches Linear/Notion muscle memory.
**Task:** [U-06]

---

## §8 — Notifications & Inbox

### Current Experience
`NotificationBell` in header; WS pushes notifications; per-feature notifications fire on invoice/grade creation.

### Problems
- No central "inbox" to triage; notifications vanish after toast.
- No grouping by type (finance/academic/system).

### Recommended Experience
- A `/notifications` inbox grouped by type with read/unread, mark-all-read, and per-type preferences (`notification_preferences` already exists in the DB).
- Toasts link into the inbox entry.

### Expected Benefits
Nothing important is missed; users control their signal/noise.
**Task:** [U-25]

---

## §9 — First-Run / Activation (Installer)

### Current Experience
`/activate/main`, `/activate/branch`, `/setup` wizard steps the admin through license + school + admin creation.

### Problems
- Multi-step but no progress indicator across the *whole* activation; partial failure leaves ambiguous state.
- Director auto-generated credentials are shown once (`director_password`) — if missed, recovery is the (now-removed) license-key reset.

### Recommended Experience
- Top-of-page activation progress (License ✓ → School ✓ → Admin ✓ → Done).
- One-time credentials shown in a copyable, emailable card with a "I've saved it" gate.
- On finish, log straight in (issue session) rather than bouncing to `/login`.

### Expected Benefits
Fewer failed activations; fewer support tickets for lost director passwords.
**Task:** [U-26]

---

## §10 — Error & Session Recovery

### Current Experience
API errors show generic "Error" empty states; 401 likely just breaks the page.

### Recommended Experience
- Global axios interceptor: 401 → clear auth + redirect `/login?reason=session`; 403 → toast "You don't have permission" (or "View-only mode"); 5xx → toast + retry.
- Offline (no network) → a non-blocking banner "Offline — changes will sync" (ties to sync roadmap).

### Expected Benefits
Predictable failure modes; users know what to do.
**Task:** [U-16]

---

## Summary — Top 5 UX Wins (by ROI)

1. **[U-01]** Remove WebGL background on dashboards — instant perceived performance.
2. **[U-02]** Replace demo numbers with real data + empty states — trust.
3. **[U-09]** Multi-step student registration with guardian smart-match — registrar throughput.
4. **[U-23]** One-screen billing & inline payment — finance throughput.
5. **[U-06]** Record-level ⌘K search — every power user, every day.

These five alone move the product from "impressive demo" to "daily-driver enterprise tool".
