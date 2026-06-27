import {
  LayoutDashboard, Users, Building2, GitBranch, Key, Shield,
  FileText, ClipboardList, Settings, UserCog, GraduationCap,
  UserCheck, DollarSign, Package, UserCircle, BookOpen, Coffee,
  Upload, ArrowUp, ArrowRightLeft, QrCode, CreditCard,
  Calendar, ClipboardCheck, FileSpreadsheet, Award,
  MessageSquare, User, Receipt, Wallet, Notebook,
  TrendingDown, Briefcase, PiggyBank, BarChart3, HardDrive,
  Truck, ShoppingCart, ArrowDown, TrendingUp, type LucideIcon,
  Plus, Activity, Bell,
} from "lucide-react"

export const ROLE_DASHBOARD: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/admin/dashboard",
  DIRECTOR: "/director/dashboard",
  REGISTRAR: "/registrar/dashboard",
  TEACHER: "/teacher/dashboard",
  FINANCE: "/finance/dashboard",
  INVENTORY: "/inventory/dashboard",
  HR: "/hr/dashboard",
  LIBRARY: "/library/dashboard",
  CAFETERIA: "/cafeteria/dashboard",
  AUDITOR: "/audit/dashboard",
  PARENT: "/parent/dashboard",
  STUDENT: "/student/dashboard",
}

export const ROLE_PREFIXES: Record<string, string[]> = {
  SUPER_ADMIN: ["/super-admin"],
  ADMIN: ["/admin"],
  DIRECTOR: ["/director"],
  REGISTRAR: ["/registrar"],
  TEACHER: ["/teacher"],
  FINANCE: ["/finance"],
  INVENTORY: ["/inventory"],
  HR: ["/hr"],
  LIBRARY: ["/library"],
  CAFETERIA: ["/cafeteria"],
  AUDITOR: ["/audit"],
  PARENT: ["/parent"],
  STUDENT: ["/student"],
}

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavSection {
  section: string
  items: NavItem[]
}

export const SUPER_ADMIN_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Schools", items: [
    { href: "/super-admin/schools", label: "All Schools", icon: Building2 },
    { href: "/super-admin/schools/new", label: "New School", icon: Plus },
  ]},
  { section: "Licensing", items: [
    { href: "/super-admin/licenses", label: "License Keys", icon: Key },
    { href: "/super-admin/licenses/new", label: "Generate License", icon: Plus },
  ]},
  { section: "Users", items: [
    { href: "/super-admin/admins", label: "School Admins", icon: Shield },
    { href: "/super-admin/users", label: "Internal Staff", icon: Users },
  ]},
  { section: "Monitoring", items: [
    { href: "/super-admin/monitoring", label: "System Health", icon: Activity },
    { href: "/super-admin/revenue", label: "Financial Control", icon: DollarSign },
    { href: "/super-admin/support", label: "Support Center", icon: MessageSquare },
    { href: "/super-admin/reports", label: "Reports", icon: FileText },
    { href: "/super-admin/audit", label: "Audit Center", icon: ClipboardList },
  ]},
  { section: "System", items: [
    { href: "/super-admin/settings", label: "Settings", icon: Settings },
  ]},
]

export const ADMIN_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Management", items: [
    { href: "/admin/branches", label: "Branches", icon: GitBranch },
    { href: "/admin/directors", label: "Directors", icon: UserCog },
    { href: "/admin/academic-years", label: "Academic Years", icon: Calendar },
    { href: "/admin/school", label: "School Profile", icon: Building2 },
  ]},
  { section: "Monitoring", items: [
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/audit", label: "Audit Logs", icon: ClipboardList },
    { href: "/admin/telegram", label: "Telegram Bot", icon: MessageSquare },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]},
]

export const DIRECTOR_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/director/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Staff", items: [
    { href: "/director/teachers", label: "Teachers", icon: GraduationCap },
    { href: "/director/teachers/new", label: "New Teacher", icon: GraduationCap },
    { href: "/director/staff", label: "Staff", icon: Users },
    { href: "/director/staff/new", label: "New Staff", icon: Users },
    { href: "/director/registrars", label: "Registrars", icon: UserCheck },
    { href: "/director/registrars/new", label: "New Registrar", icon: UserCheck },
  ]},
  { section: "Oversight", items: [
    { href: "/director/finance", label: "Finance", icon: DollarSign },
    { href: "/director/inventory", label: "Inventory", icon: Package },
    { href: "/director/hr", label: "HR", icon: UserCircle },
    { href: "/director/library", label: "Library", icon: BookOpen },
    { href: "/director/cafeteria", label: "Cafeteria", icon: Coffee },
  ]},
  { section: "Monitoring", items: [
    { href: "/director/reports", label: "Reports", icon: FileText },
    { href: "/director/audit", label: "Audit", icon: ClipboardList },
  ]},
]

export const REGISTRAR_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/registrar/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Students", items: [
    { href: "/registrar/students", label: "All Students", icon: Users },
    { href: "/registrar/students/new", label: "Register New", icon: Upload },
    { href: "/registrar/students/import", label: "Bulk Import", icon: Upload },
    { href: "/registrar/promotions", label: "Promotions", icon: ArrowUp },
    { href: "/registrar/transfers", label: "Transfers", icon: ArrowRightLeft },
  ]},
  { section: "Parents", items: [{ href: "/registrar/parents", label: "Parents", icon: UserCircle }] },
  { section: "Tools", items: [
    { href: "/registrar/qr", label: "QR Codes", icon: QrCode },
    { href: "/registrar/nfc", label: "NFC Cards", icon: CreditCard },
    { href: "/registrar/documents", label: "Documents", icon: FileText },
  ]},
]

export const TEACHER_NAV: NavSection[] = [
  { section: "Main", items: [
    { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/timetable", label: "My Timetable", icon: Calendar },
  ]},
  { section: "Teaching", items: [
    { href: "/teacher/students", label: "Students", icon: Users },
    { href: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/teacher/grades", label: "Gradebook", icon: FileSpreadsheet },
    { href: "/teacher/results", label: "Results", icon: Award },
  ]},
  { section: "Communication", items: [
    { href: "/teacher/messages", label: "Messages", icon: MessageSquare },
    { href: "/teacher/profile", label: "Profile", icon: User },
  ]},
]

export const FINANCE_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/finance/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Billing", items: [
    { href: "/finance/billing", label: "Billing", icon: Receipt },
    { href: "/finance/invoices", label: "Invoices", icon: FileText },
    { href: "/finance/payments", label: "Payments", icon: DollarSign },
    { href: "/finance/wallets", label: "Wallets", icon: Wallet },
  ]},
  { section: "Accounting", items: [
    { href: "/finance/ledger", label: "Ledger", icon: BookOpen },
    { href: "/finance/journal", label: "Journal", icon: Notebook },
    { href: "/finance/expenses", label: "Expenses", icon: TrendingDown },
  ]},
  { section: "HR Finance", items: [
    { href: "/finance/payroll", label: "Payroll", icon: Briefcase },
    { href: "/finance/budgets", label: "Budgets", icon: PiggyBank },
  ]},
  { section: "Reports", items: [{ href: "/finance/reports", label: "Reports", icon: BarChart3 }] },
]

export const INVENTORY_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/inventory/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Stock", items: [
    { href: "/inventory/items", label: "Items", icon: Package },
    { href: "/inventory/assets", label: "Assets", icon: HardDrive },
    { href: "/inventory/suppliers", label: "Suppliers", icon: Truck },
    { href: "/inventory/transfers", label: "Transfers", icon: ArrowRightLeft },
  ]},
  { section: "Procurement", items: [{ href: "/inventory/purchases", label: "Purchases", icon: ShoppingCart }] },
  { section: "Reports", items: [{ href: "/inventory/reports", label: "Reports", icon: BarChart3 }] },
]

export const HR_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "People", items: [
    { href: "/hr/employees", label: "Employees", icon: Users },
    { href: "/hr/contracts", label: "Contracts", icon: FileText },
    { href: "/hr/attendance", label: "Attendance", icon: ClipboardCheck },
  ]},
  { section: "Management", items: [
    { href: "/hr/performance", label: "Performance", icon: Award },
    { href: "/hr/recruitment", label: "Recruitment", icon: Briefcase },
  ]},
  { section: "Compensation", items: [{ href: "/hr/payroll", label: "Payroll", icon: DollarSign }] },
  { section: "Reports", items: [{ href: "/hr/reports", label: "Reports", icon: BarChart3 }] },
]

export const LIBRARY_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/library/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Books", items: [
    { href: "/library/books", label: "Books", icon: BookOpen },
    { href: "/library/members", label: "Members", icon: Users },
    { href: "/library/borrow", label: "Borrow", icon: ArrowUp },
    { href: "/library/returns", label: "Returns", icon: ArrowDown },
    { href: "/library/fines", label: "Fines", icon: DollarSign },
  ]},
  { section: "Reports", items: [{ href: "/library/reports", label: "Reports", icon: BarChart3 }] },
]

export const CAFETERIA_NAV: NavSection[] = [
  { section: "Main", items: [
    { href: "/cafeteria/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cafeteria/pos", label: "POS Terminal", icon: ShoppingCart },
  ]},
  { section: "Products", items: [
    { href: "/cafeteria/products", label: "Products", icon: Coffee },
    { href: "/cafeteria/orders", label: "Orders", icon: ShoppingCart },
    { href: "/cafeteria/sales", label: "Sales", icon: TrendingUp },
  ]},
  { section: "Finance", items: [
    { href: "/cafeteria/wallet", label: "Wallet Top-up", icon: Wallet },
    { href: "/cafeteria/reports", label: "Reports", icon: BarChart3 },
  ]},
]

export const AUDITOR_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/audit/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Audit", items: [
    { href: "/audit/logs", label: "Audit Logs", icon: ClipboardList },
    { href: "/audit/security", label: "Security", icon: Shield },
    { href: "/audit/reports", label: "Reports", icon: FileText },
  ]},
]

export const PARENT_NAV: NavSection[] = [
  { section: "Main", items: [
    { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parent/children", label: "My Children", icon: Users },
  ]},
  { section: "Academic", items: [
    { href: "/parent/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/parent/results", label: "Results", icon: Award },
  ]},
  { section: "Finance", items: [
    { href: "/parent/wallet", label: "Wallet", icon: Wallet },
    { href: "/parent/payments", label: "Payments", icon: DollarSign },
  ]},
  { section: "Communication", items: [
    { href: "/parent/messages", label: "Messages", icon: MessageSquare },
    { href: "/parent/notifications", label: "Notifications", icon: Bell },
    { href: "/parent/profile", label: "Profile", icon: User },
  ]},
]

export const STUDENT_NAV: NavSection[] = [
  { section: "Main", items: [{ href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Academic", items: [
    { href: "/student/attendance", label: "My Attendance", icon: ClipboardCheck },
    { href: "/student/results", label: "My Results", icon: Award },
    { href: "/student/timetable", label: "Timetable", icon: Calendar },
    { href: "/student/assignments", label: "Assignments", icon: FileText },
  ]},
  { section: "Finance", items: [{ href: "/student/wallet", label: "Wallet", icon: Wallet }] },
  { section: "Account", items: [{ href: "/student/profile", label: "Profile", icon: User }] },
]

export const ROLE_NAV_MAP: Record<string, NavSection[]> = {
  SUPER_ADMIN: SUPER_ADMIN_NAV,
  ADMIN: ADMIN_NAV,
  DIRECTOR: DIRECTOR_NAV,
  REGISTRAR: REGISTRAR_NAV,
  TEACHER: TEACHER_NAV,
  FINANCE: FINANCE_NAV,
  INVENTORY: INVENTORY_NAV,
  HR: HR_NAV,
  LIBRARY: LIBRARY_NAV,
  CAFETERIA: CAFETERIA_NAV,
  AUDITOR: AUDITOR_NAV,
  PARENT: PARENT_NAV,
  STUDENT: STUDENT_NAV,
}
