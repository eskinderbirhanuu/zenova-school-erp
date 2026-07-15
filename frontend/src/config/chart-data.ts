export const enrollmentData = [
  { month: "Sep", students: 120 }, { month: "Oct", students: 145 },
  { month: "Nov", students: 162 }, { month: "Dec", students: 158 },
  { month: "Jan", students: 175 }, { month: "Feb", students: 190 },
  { month: "Mar", students: 210 }, { month: "Apr", students: 225 },
  { month: "May", students: 240 }, { month: "Jun", students: 255 },
]

export const revenueData = [
  { month: "Sep", revenue: 45000, expenses: 32000 },
  { month: "Oct", revenue: 52000, expenses: 34000 },
  { month: "Nov", revenue: 48000, expenses: 31000 },
  { month: "Dec", revenue: 61000, expenses: 38000 },
  { month: "Jan", revenue: 58000, expenses: 36000 },
  { month: "Feb", revenue: 63000, expenses: 39000 },
  { month: "Mar", revenue: 72000, expenses: 42000 },
  { month: "Apr", revenue: 68000, expenses: 40000 },
  { month: "May", revenue: 75000, expenses: 43000 },
  { month: "Jun", revenue: 82000, expenses: 45000 },
]

export const recentTransactions = [
  { action: "Invoice generated", amount: "$12,500", time: "10 min ago", badge: "success" as const },
  { action: "Payment received", amount: "$8,200", time: "25 min ago", badge: "success" as const },
  { action: "Expense recorded", amount: "$1,450", time: "1 hour ago", badge: "warning" as const },
  { action: "Budget updated", amount: "$50,000", time: "2 hours ago", badge: "info" as const },
  { action: "Payroll processed", amount: "$34,000", time: "3 hours ago", badge: "purple" as const },
]

export const actionAlerts = [
  { label: "Pending Invoices", count: 12, variant: "warning" as const, href: "/finance/invoices?status=pending" },
  { label: "Overdue Payments", count: 4, variant: "destructive" as const, href: "/finance/payments?status=overdue" },
  { label: "Budget Warnings", count: 3, variant: "info" as const, href: "/finance/budgets?alert=true" },
]

export const cashFlowFunnel = [
  { label: "Revenue", value: 82000, color: "bg-primary" },
  { label: "Collections", value: 67500, color: "bg-emerald-500" },
  { label: "Net", value: 37000, color: "bg-sky-500" },
]

export const receivableAging = [
  { label: "Current", value: 24500, color: "bg-emerald-500" },
  { label: "30 Days", value: 12800, color: "bg-sky-500" },
  { label: "60 Days", value: 6400, color: "bg-amber-500" },
  { label: "90+ Days", value: 3100, color: "bg-red-500" },
]
