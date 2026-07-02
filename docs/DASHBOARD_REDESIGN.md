# Dashboard Redesign — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2
**Philosophy:** Every dashboard answers one question first — *"what needs me right now?"* — then supports with context. Today's dashboards are equal-weight grids of (mostly mocked) KPIs + charts. The redesign introduces **priority zones**: an Actionable Top (alerts + primary KPIs), an Analysis Middle (charts), and a Context Bottom (recent activity + quick actions). No WebGL background on any dashboard ([U-01]); real data or explicit empty states ([U-02]).

Format per dashboard:

```
### Current Problems
### Recommended Layout
### Widget Suggestions
### Charts
### KPIs
```

ASCII mockups use the convention: `[...]` = card, `▾` = dropdown, `( )` = radiogroup.

---

## 1. Super Admin — Mission Control

### Current Problems
- Static demo numbers (school count, revenue, health) → trust gap.
- No drill-down from a KPI to the filtered list.
- 3D background drains the very machines being monitored.

### Recommended Layout (desktop)
```
┌─────────────────────────────────────────────────────────────┐
│ Hero: "Mission Control"  [Env: production] [Sync: ●]  [▾ 7d]│
├─────────────────────────────────────────────────────────────┤
│ ACTION ALERTS (what needs me now)                           │
│ [⚠ 3 licenses expiring ≤7d] [⚠ 2 schools offline] [● sync queue: 14]│
├──────────────────────────────┬──────────────────────────────┤
│ KPI: Schools        42  ▴2   │ KPI: Active licenses  187     │
│ KPI: MRR       $12,840  ▴5%  │ KPI: Support tickets open  6  │
├──────────────────────────────┴──────────────────────────────┤
│ CHART: Revenue (MRR) by month — area  │ CHART: License mix — donut│
├─────────────────────────────────────────────────────────────┤
│ RECENT: license issued / school activated / ticket opened   │
└─────────────────────────────────────────────────────────────┘
```

### Widget Suggestions
- **Actionable alert tiles** (clickable → filtered list).
- **System health panel**: DB conns, Redis, license-server reachability, sync queue depth.
- **Per-school table** (searchable) with status pill + license expiry.

### Charts
- MRR area chart (real `/super-admin/revenue`).
- License-type donut (trial/monthly/yearly/lifetime).

### KPIs
Schools (active), Active licenses, MRR, Open support tickets, Expiring-soon licenses, Sync queue depth.

**Task:** [U-02]

---

## 2. Admin — Control Center (School)

### Current Problems
- KPIs present but partly mocked; academic/finance/HR counts need real backing.
- No "today" framing.

### Recommended Layout
```
Hero: "{School name}"  Term: Q2 2026  [Today: 30 Jun]
[ALERTS: 4 new admissions pending • 2 invoices overdue • timetable conflict in G10B]
[ KPI: Students ] [ KPI: Staff ] [ KPI: Fees collected (term) ] [ KPI: Attendance today ]
[ CHART: Enrollment trend ]      [ CHART: Fee collection vs target ]
[ QUICK ACTIONS: Add student | Create invoice | Announce | Build timetable ]
[ RECENT activity feed ]
```

### Widget Suggestions
- **Today snapshot**: attendance %, fees collected today, new admissions.
- **Quick actions** row (one-click into the 4 most common admin tasks).

### Charts
- Enrollment by grade (bar).
- Fee collection vs target (progress).

### KPIs
Total students, Staff count, Fees collected (term), Attendance % today, Pending admissions, Overdue invoices.

**Task:** [U-02]

---

## 3. Finance — Fintech Dashboard

### Current Problems
410-line page, equal-weight sections, no "what now" lead. Cash-flow funnel + aging + chart + transactions + alerts all compete.

### Recommended Layout
```
Hero: "Finance"  ( ) This month ( ) Last ( ) Quarter ( ) Year
[ ACTION: 12 pending invoices • 4 overdue payments • 3 budget warnings ]  → clickable
[ KPI: Cash available ] [ KPI: Outstanding receivables ] [ KPI: Net (period) ] [ KPI: Collected % ]
[ CHART: Revenue vs Expenses (area) ]
[ Cash-flow funnel ]            [ Receivables aging (stacked bar) ]
[ Recent transactions (compact table) ]   [ Month-end checklist ✓✓☐☐ ]
```

### Widget Suggestions
- **Month-end checklist** ([U-12]): reconciliation/payroll/trial-balance/lock.
- **Inline "Take payment"** from the overdue alerts.

### Charts
- Revenue vs Expenses area (primary).
- Receivables aging stacked bar (replaces literal bars).
- Collection rate gauge.

### KPIs
Cash available, Outstanding receivables, Net (period), Collected %, Overdue count, Pending invoices.

**Task:** [U-12]

---

## 4. Teacher — Classroom

### Current Problems
Today's classes aren't surfaced; attendance and grades disconnected from timetable.

### Recommended Layout
```
Hero: "Hi {name}"  [Today: 30 Jun, Period 3 now]
[ TODAY: card per period → "Take attendance" / "Enter grades" ]
[ KPI: My students ] [ KPI: Avg attendance ] [ KPI: Grades pending ] [ KPI: Unread messages ]
[ CHART: Class performance by subject ]
[ Pending grade entry (table) ]   [ Recent announcements ]
```

### Widget Suggestions
- **Today's periods** as action cards (the headline).
- **Pending grade entry** list (one click into the grid).

### Charts
- Class average by subject (bar).

### KPIs
My students, Avg attendance %, Grades pending entry, Unread messages, Classes today.

**Task:** [U-24]

---

## 5. Parent Portal (Mobile-first)

### Current Problems
Payment broken server-side (backend Task-04); wallet top-up disconnected from invoice; child switcher field mismatch.

### Recommended Layout (mobile)
```
[Child switcher: ● Abebe  ○ Sara ]
[Card: Abebe — Grade 10B | Attendance 94% | Wallet ETB 1,200]
[ WHAT YOU OWE: ETB 4,500  [ Pay all → ] ]      (Chapa)
[ Recent grades (compact) ]
[ Attendance last 30d (sparkline) ]
[ Notifications ]
```

### Widget Suggestions
- **Combined "What you owe"** with single Pay button + inline wallet top-up on insufficient balance.
- **Sparkline attendance**; tap → detail.

### Charts
- Attendance sparkline (30d).
- Grade trend per subject (compact).

### KPIs
Attendance %, Wallet balance, Outstanding total, Last result.

**Task:** [U-13], [U-23]

---

## 6. Student Portal (Mobile-first)

### Current Layout problems
Similar to parent; ensure it's truly mobile and not a shrunken desktop.

### Recommended Layout (mobile)
```
[Today: 30 Jun | Period 3: Math — Room 204]
[ KPI: My attendance ] [ KPI: Wallet ] [ KPI: Assignments due ]
[ My results (last term) ] [ Timetable (today) ] [ Assignments due ]
```

### KPIs
Attendance %, Wallet, Assignments due, Next class.

**Task:** [U-21]

---

## 7. Registrar Dashboard

### Current Problems
348 lines; admission-focused but no queue/pipeline view.

### Recommended Layout
```
[ALERTS: 5 registrations in progress • 3 documents pending]
[ KPI: Students ] [ KPI: New this week ] [ KPI: Pending admissions ] [ KPI: Transfers ]
[ ADMISSIONS PIPELINE: Applied → Docs verified → Placed ]
[ QUICK: Register | Bulk import | Promote | Transfer ]
```

### Widget Suggestions
- **Admissions pipeline** (kanban-ish) per stage.
- Resume-draft list (ties to [U-09] autosave).

### KPIs
Total students, New this week, Pending admissions, Transfers this term.

**Task:** [U-09]

---

## 8. Director Dashboard

### Current Problems
Sidebar duplicates every module; dashboard thin (211 lines).

### Recommended Layout
```
[ KPI: Teachers ] [ KPI: Staff ] [ KPI: Dept performance ] [ KPI: Open HR items ]
[ CHART: Department performance matrix ]
[ Oversight links: Finance • HR • Inventory (view-only banner) ]
```
Keep it **oversight**, not a second copy of each module ([U-07]).

### KPIs
Teachers, Staff, Avg department performance, Open leave/HR items.

**Task:** [U-07]

---

## 9. HR / Inventory / Library / Cafeteria / Auditor

| Dashboard | Lead KPIs | Headline widget |
|----------|-----------|-----------------|
| HR | Headcount, Open positions, Leave pending, Payroll due | Leave approvals queue |
| Inventory | Stock value, Low-stock items, Pending POs, Transfers | Low-stock alert list |
| Library | Books, Borrowed today, Overdue, Fines due | Overdue/returns queue |
| Cafeteria | Today's sales, Orders pending, Low stock, Wallet top-ups | Live POS launcher + order tickets |
| Auditor | Events today, Failed logins, Sensitive actions, Active users | Audit log stream (live) |

Each follows the **Action → KPI → Chart → Recent** pattern. Cafeteria emphasizes the POS launcher (touch). Auditor emphasizes a live, filterable log stream.

**Task:** [U-02], [U-22] (cafeteria)

---

## 10. Universal Dashboard Skeleton (loading)

Replace full-page spinner ([U-14]) with a skeleton matching the real layout:

```
[ hero bar (pulse) ]
[ KPI placeholder ×4 (pulse) ]
[ chart placeholder h-[280px] (pulse) ]   [ chart placeholder (pulse) ]
[ list placeholder rows ×3 (pulse) ]
```

---

## Cross-cutting dashboard rules

1. **One H1** (hero) per dashboard; period selector top-right where relevant.
2. **Every KPI is clickable** to a filtered list of the underlying records.
3. **Every chart has a fallback** empty state ("No data for this period yet").
4. **No WebGL** on dashboards ([U-01]); opaque cards.
5. **Real data only** ([U-02]); mock behind a single off-in-prod flag.
6. Charts capped at 3 per dashboard; mobile shows ≤2.
