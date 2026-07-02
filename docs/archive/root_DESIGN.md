# ZENOVA Design System

## Philosophy
Premium SaaS. Enterprise Grade. Modern. Minimal. Elegant. Fast. Professional.

Inspired by Linear, Stripe, Notion, Framer, Vercel — but uniquely ZENOVA.

## Layout Principles

### Grid
- Base 4px grid system
- Generous whitespace — never crowded
- Card layouts with bento grid patterns
- Max content width: 1400px
- Page padding: 24px (py-6 px-6)

### Z-Index Hierarchy
| Layer | Z-Index | Use |
|---|---|---|
| Background | -10 | Fixed backgrounds |
| Content | 0 | Main page content |
| Elevated | 10 | Cards, panels |
| Nav | 50 | Top bar, sidebar |
| Overlay | 100 | Drawers, modals |
| Tooltip | 500 | Tooltips, dropdowns |
| Toast | 1000 | Notifications |

## Color System

### Primary Palette
| Token | HSL | Hex | Usage |
|---|---|---|---|
| Primary | 200 98% 32% | #0369A1 | CTAs, links, active states |
| Primary Light | 190 100% 92% | #BAE6FD | Hover backgrounds |
| Primary Dark | 200 98% 26% | #025985 | Pressed states |

### Semantic Colors
| Token | HSL | Hex | Usage |
|---|---|---|---|
| Success | 160 84% 39% | #10B981 | Confirmations, active |
| Warning | 38 92% 50% | #F59E0B | Alerts, pending |
| Destructive | 0 84% 60% | #DC2626 | Errors, delete |
| Info | 200 98% 40% | #0284C7 | Information |

### Chart Palette
| Token | HSL | Hex | Usage |
|---|---|---|---|
| Chart 1 | 200 98% 32% | #036_fake | Primary series |
| Chart 2 | 160 84% 39% | #10B981 | Secondary series |
| Chart 3 | 262 83% 58% | #8B5CF6 | Tertiary series |
| Chart 4 | 38 92% 50% | #F59E0B | Warning series |
| Chart 5 | 0 84% 60% | #DC2626 | Destructive series |

## Typography

| Element | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero Title | Inter | 32px (text-3xl) | 700 (bold) | -0.02em |
| Section Title | Inter | 18px (text-lg) | 600 | -0.01em |
| Card Title | Inter | 16px (text-base) | 600 | normal |
| Body | Inter | 14px (text-sm) | 400 | normal |
| KPI Value | Inter | 24px (text-2xl) | 700 | -0.02em |
| Label | Inter | 12px (text-xs) | 500 | 0.05em (uppercase) |

## Component Rules

### Cards
- Background: `--card` (#FFFFFF)
- Border: `border` (hsl(210 20% 90%)) rounded `rounded-xl`
- Shadow: `shadow-sm` default, `shadow-md` on hover
- Inner padding: `p-6`
- Transition: `transition-all duration-200`

### KPICard
- Icon in `rounded-lg bg-primary/5 p-2.5 text-primary`
- Value in `text-2xl font-bold tracking-tight`
- Description in `text-sm text-muted-foreground`
- Optional trend indicator
- Hover: subtle shadow lift

### Buttons
- Primary: `bg-primary text-white shadow-sm hover:bg-primary/90`
- Secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- Outline: `border border-input bg-background hover:bg-accent`
- Ghost: `hover:bg-accent hover:text-accent-foreground`
- Loading state: Loader2 spinner + disabled

### Tables
- Header: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
- Row: `border-b last:border-0 hover:bg-muted/30 transition-colors`
- Sticky header on scroll
- Zebra striping optional

## Motion
- Page transitions: 0.4s ease-out fade + translateY(10px)
- Card hover: 0.2s ease-out shadow lift
- Button hover: 0.15s ease-out scale(1.02)
- Loading skeletons: pulse animation
- Drawer: 0.3s ease-out translateX

## Dashboard Rules
Every dashboard must include:
1. Hero Header with title + description + contextual actions
2. KPI Cards row (4-6 cards)
3. Analytics section (charts)
4. Recent Activity section
5. Quick Actions or Contextual Panel

## Role Differentiation
- **Super Admin**: Mission Control - Global monitoring, system health
- **Admin**: Control Center - School overview, operational management
- **Director**: Executive Analytics - School performance, department monitoring
- **Registrar**: Workflow - Admissions, registration, QR/NFC
- **Teacher**: Classroom - Attendance, grades, assignments
- **Finance**: Fintech-inspired - Stripe-style clarity, revenue dashboards
- **Parent**: Consumer - Mobile-first, children overview
- **Student**: Modern Learning - Assignments, results, attendance
- **HR**: People Management - Staff, contracts, payroll
- **Library**: Book Management - Checkouts, fines, catalog
- **Cafeteria**: POS Experience - Orders, sales, inventory
- **Inventory**: Supply Chain - Stock, transfers, purchases
- **Auditor**: Compliance - Audit logs, security, reports
