# Dashboard Engine

## Executive Summary

ZENOVA currently has 15 separate dashboard page files — one per role. Every
new role requires cloning a dashboard page, even though all dashboards call
the same backend endpoint.

This document defines the target dashboard engine: a **single, adaptive
dashboard** that renders widgets based entirely on the user's effective
permissions. No role-specific dashboard pages. No duplicated code.

---

## Why This Change Is Needed

### Problem 1: 15 Dashboard Files

There are 15 dashboard page files at:
```
(super-admin)/super-admin/dashboard/page.tsx
(admin)/admin/dashboard/page.tsx
(director)/director/dashboard/page.tsx
(teacher)/teacher/dashboard/page.tsx
...
```

All of them call the same `useDashboardOverview()` hook.

### Problem 2: Adding a Role Requires a Dashboard

When a school creates "Digital Learning Coordinator," they would need to:
1. Create a route group `(digital-learning)/`
2. Create `digital-learning/dashboard/page.tsx`
3. Register in middleware
4. Add to navigation config

### Problem 3: Role-Specific Layout Means Role-Specific Dashboard

Each route group has its own layout with its own sidebar, header, and guards.
This locks dashboards to roles.

---

## Target Architecture

### Single Dashboard Route

Instead of 15 dashboard paths:

| Before | After |
|--------|-------|
| `/admin/dashboard` | `/dashboard` |
| `/teacher/dashboard` | `/dashboard` |
| `/director/dashboard` | `/dashboard` |
| `/finance/dashboard` | `/dashboard` |

Everyone goes to the same URL. What they see is determined by their
permissions, not their role name.

### Widget Registry

Widgets are registered in the module system:

```python
# Registered in each module
WIDGETS = {
    "student-stats": {
        "title": "Student Statistics",
        "icon": "Users",
        "permission": "students.read",
        "module": "students",
        "priority": 10,
        "component": "StudentStatsWidget",
        "size": "medium",  # small | medium | large | full
    },
    "attendance-summary": {
        "title": "Today's Attendance",
        "icon": "Clock",
        "permission": "attendance.read",
        "module": "attendance",
        "priority": 20,
        "component": "AttendanceWidget",
        "size": "small",
    },
    "finance-summary": {
        "title": "Finance Summary",
        "icon": "DollarSign",
        "permission": "finance.journal.create",
        "module": "finance",
        "priority": 30,
        "component": "FinanceSummaryWidget",
        "size": "medium",
    },
    "revenue-chart": {
        "title": "Revenue Trend",
        "icon": "BarChart3",
        "permission": "finance.reports.view",
        "module": "finance",
        "priority": 35,
        "component": "RevenueChartWidget",
        "size": "large",
    },
    "library-summary": {
        "title": "Library Activity",
        "icon": "BookOpen",
        "permission": "library.manage",
        "module": "library",
        "priority": 40,
        "component": "LibraryWidget",
        "size": "small",
    },
    "calendar": {
        "title": "Upcoming Events",
        "icon": "Calendar",
        "permission": None,  # visible to everyone
        "module": "core",
        "priority": 90,
        "component": "CalendarWidget",
        "size": "small",
    },
    "notifications": {
        "title": "Notifications",
        "icon": "Bell",
        "permission": None,
        "module": "core",
        "priority": 100,
        "component": "NotificationWidget",
        "size": "small",
    },
}
```

### Widget Resolution

```python
def get_user_widgets(user):
    """Return all widgets the user can see, ordered by priority."""
    available = []
    for widget in WIDGETS.values():
        if widget["permission"] is None:
            available.append(widget)
        elif user.has_permission(widget["permission"]):
            available.append(widget)
    return sorted(available, key=lambda w: w["priority"])
```

### Adaptive Layout

The dashboard layout adapts based on the number and size of widgets:

```
# User with: students.read, attendance.mark, grades.enter

┌──────────────────────────────────────────────────────────────┐
│  Welcome back, Eskinder!                         [role: ▲]  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Students     │  │ Attendance   │  │ Calendar         │   │
│  │ Total: 1,234 │  │ Today: 92%   │  │ 3 events today   │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │ Grade Overview (This Term)                         │      │
│  │ ┌──────┬──────┬──────┬──────┬──────┐               │      │
│  │ │ A    │ B    │ C    │ D    │ F    │               │      │
│  │ │ 35%  │ 28%  │ 20%  │ 12%  │ 5%   │               │      │
│  │ └──────┴──────┴──────┴──────┴──────┘               │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────────┐                     │
│  │ Notifications│  │ Upcoming Events  │                     │
│  │ 3 unread     │  │ Staff meeting    │                     │
│  └──────────────┘  └──────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

If the user also has `finance.journal.create`:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Students     │  │ Attendance   │  │ Finance      │
│ Total: 1,234 │  │ Today: 92%   │  │ Revenue $45K │
└──────────────┘  └──────────────┘  └──────────────┘
```

The grid auto-sizes. No role-specific page code.

---

### Role Switcher Visible

A user with multiple roles (Director + Teacher) sees a union of both
roles' widgets. They can also use the Role Switcher to filter the view:

```
[Current View: All Roles ▼]    ← "All Roles" shows union
  All Roles                    ← default
  Director                     ← filter to Director widgets only
  Teacher                      ← filter to Teacher widgets only
```

---

### Backend: Unified Dashboard API

The single backend endpoint already exists at `GET /api/v1/dashboard/overview`.
It already returns data based on `current_user.school_id`.

The enhancement adds per-widget data endpoints:

```
GET /api/v1/dashboard/widgets                     → list of available widgets
GET /api/v1/dashboard/widgets/student-stats/data  → widget-specific data
GET /api/v1/dashboard/widgets/finance-summary/data
```

Each widget endpoint checks the required permission before returning data.

---

### Frontend: DashboardPage

```tsx
// app/dashboard/page.tsx — the only dashboard page
export default function DashboardPage() {
  return (
    <div>
      <WelcomeHeader />
      <DashboardWidgetGrid />
    </div>
  )
}
```

```tsx
// components/dashboard/DashboardWidgetGrid.tsx
export function DashboardWidgetGrid() {
  const { user } = useAuth()
  const widgets = useDashboardWidgets()  // filtered by permissions

  return (
    <ResponsiveGrid>
      {widgets.map(w => <WidgetCard key={w.id} widget={w} />)}
    </ResponsiveGrid>
  )
}
```

---

### Widget Sizing

The grid uses a masonry-like layout where widgets declare their preferred size:

| Size | Width | Height | Example |
|------|-------|--------|---------|
| `small` | 1 col | 1 row | Stat card (total students) |
| `medium` | 1 col | 2 row | Finance summary |
| `large` | 2 col | 2 row | Revenue chart |
| `full` | full width | 2 row | Table |

The grid arranges them responsively:

```
small  small  small  small
medium medium large
small  small  full
```

---

### Role Groups Become Optional

Role-specific route groups (`(admin)/`, `(teacher)/`) are no longer needed
for the dashboard. They can be retained for backward compatibility but
simplified to just use the single dashboard page.

New roles don't need a route group. The user just needs the permission,
and `/dashboard` automatically shows the right widgets.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Dashboard pages | 15 separate files | 1 file |
| New role | Create dashboard page | Just assign permissions |
| Widget visibility | Hardcoded per page | Auto based on permissions |
| Layout | Duplicated per role | Single adaptive grid |
| Backend data | Single endpoint | Per-widget endpoints |
| Role filter | Not possible | Role Switcher filters widgets |
