"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, GraduationCap, DollarSign, Package,
  UserCircle, BookOpen, ClipboardList, Settings, LogOut, Bell,
  FileText, ShoppingCart, Briefcase, Shield, Upload, ArrowUp,
  CalendarDays,
} from "lucide-react"
import { useAuth } from "@/services/auth-context"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR", "TEACHER", "FINANCE", "HR", "INVENTORY", "LIBRARY", "CAFETERIA", "AUDITOR"] },
  { href: "/students", label: "Students", icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "REGISTRAR", "TEACHER", "FINANCE"] },
  { href: "/academic", label: "Academic", icon: GraduationCap, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR", "TEACHER"] },
  { href: "/academic/gradebook", label: "Gradebook", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "DIRECTOR"] },
  { href: "/academic/promotion", label: "Promotion", icon: ArrowUp, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR"] },
  { href: "/finance", label: "Finance", icon: DollarSign, roles: ["SUPER_ADMIN", "ADMIN", "FINANCE", "AUDITOR", "DIRECTOR"] },
  { href: "/hr", label: "HR", icon: UserCircle, roles: ["SUPER_ADMIN", "ADMIN", "HR", "DIRECTOR"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["SUPER_ADMIN", "ADMIN", "INVENTORY", "FINANCE"] },
  { href: "/library", label: "Library", icon: BookOpen, roles: ["SUPER_ADMIN", "ADMIN", "LIBRARY"] },
  { href: "/communications", label: "Notifications", icon: Bell, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR", "TEACHER", "FINANCE", "HR", "INVENTORY", "LIBRARY", "CAFETERIA"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR", "TEACHER", "FINANCE", "HR", "INVENTORY"] },
  { href: "/bulk-import", label: "Bulk Import", icon: Upload, roles: ["SUPER_ADMIN", "ADMIN", "REGISTRAR", "HR"] },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN", "FINANCE", "AUDITOR", "DIRECTOR"] },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart, roles: ["SUPER_ADMIN", "ADMIN", "INVENTORY", "FINANCE"] },
  { href: "/payroll-budget", label: "Payroll & Budget", icon: Briefcase, roles: ["SUPER_ADMIN", "ADMIN", "FINANCE", "HR"] },
  { href: "/users", label: "Users", icon: Shield, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList, roles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const visibleItems = navItems.filter((item: any) => user && item.roles.includes(user.role as string))

  return (
    <aside className="flex h-screen w-64 flex-col border-r glass">
      <div className="flex h-14 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          Z
        </div>
        <span className="font-semibold">ZENOVA</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item: any) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-4">
        <div className="mb-2 px-3 py-2">
          <p className="text-sm font-medium truncate">{user?.full_name}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
