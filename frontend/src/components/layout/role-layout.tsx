"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/services/auth-context"
import { NotificationBell } from "@/components/layout/notification-bell"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { LogOut, ChevronRight, Menu, X, ChevronDown, Search, type LucideIcon } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { ROLE_ACCENT, type RoleAccent } from "@/config/navigation"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  section: string
  items: NavItem[]
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
    >
      Skip to main content
    </a>
  )
}

function SidebarNav({ items, pathname, onNavigate, collapsed }: { items: NavSection[]; pathname: string; onNavigate?: () => void; collapsed: boolean }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
    new Set(items.map((s) => s.section))
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  return (
    <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Main navigation">
      {items.map((section) => {
        const isExpanded = expandedSections.has(section.section)
        return (
          <div key={section.section}>
            <button
              onClick={() => toggleSection(section.section)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors",
                collapsed && "justify-center px-0"
              )}
              aria-expanded={isExpanded}
              aria-label={`${section.section} section`}
            >
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{section.section}</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", !isExpanded && "-rotate-90")} />
                </>
              )}
              {collapsed && <span className="sr-only">{section.section}</span>}
            </button>
            {isExpanded && section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group relative",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground")} />
                  {!collapsed && <span>{item.label}</span>}
                  {collapsed && <span className="sr-only">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean)
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <ol className="flex items-center gap-1" itemScope itemType="https://schema.org/BreadcrumbList">
        {segments.map((seg, i) => (
          <li
            key={i}
            className="flex items-center gap-1"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
            <span
              itemProp="name"
              className={cn(i === segments.length - 1 && "font-medium text-foreground")}
              aria-current={i === segments.length - 1 ? "page" : undefined}
            >
              {seg.charAt(0).toUpperCase() + seg.slice(1)}
            </span>
            <meta itemProp="position" content={String(i + 1)} />
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function RoleLayout({ role, navItems, children }: { role: string; navItems: NavSection[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const mobileSidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.DEFAULT

  const handleLogout = () => {
    logout()
    router.push(role === "SUPER_ADMIN" ? "/super-admin/login" : "/login")
  }

  useEffect(() => {
    if (mobileOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      const firstFocusable = mobileSidebarRef.current?.querySelector<HTMLElement>(
        'a, button, input, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false)
        return
      }
      if (e.key === "Tab" && mobileSidebarRef.current) {
        const focusable = mobileSidebarRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (commandOpen) return
  }, [commandOpen])

  const closeCommandPalette = useCallback(() => setCommandOpen(false), [])

  return (
    <div className="flex min-h-screen">
      <SkipLink />

      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:border-r glass lg:h-screen lg:sticky lg:top-0 transition-all duration-300",
          collapsed ? "lg:w-[68px]" : "lg:w-64"
        )}
        style={{ borderLeftColor: `hsl(${accent.hue}, 70%, 55%)` } as React.CSSProperties}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm text-white shrink-0"
            style={{ backgroundColor: `hsl(${accent.hue}, 70%, 50%)` }}
          >
            Z
          </div>
          {!collapsed && <span className="font-semibold">ZENOVA</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "ml-auto h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              collapsed && "ml-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", !collapsed && "rotate-180")} />
          </button>
        </div>
        <SidebarNav items={navItems} pathname={pathname} collapsed={collapsed} />
        <Separator />
        {!collapsed ? (
          <div className="p-3">
            <div className="mb-2 px-3 py-2">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-2 flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {user?.full_name?.[0] || "?"}
            </div>
            <button
              onClick={handleLogout}
              className="mt-1 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside
            ref={mobileSidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r glass"
          >
            <div className="flex h-14 items-center justify-between border-b px-6">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm text-white"
                  style={{ backgroundColor: `hsl(${accent.hue}, 70%, 50%)` }}
                >
                  Z
                </div>
                <span className="font-semibold">ZENOVA</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarNav items={navItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} collapsed={false} />
            <Separator />
            <div className="p-4">
              <p className="mb-2 px-3 text-sm font-medium truncate">{user?.full_name}</p>
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center gap-4 px-4 lg:px-6 glass">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumbs pathname={pathname} />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex gap-2 text-muted-foreground h-8 rounded-lg border border-border/60 px-3 text-xs"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
            <NotificationBell />
          </div>
        </header>
        <main
          ref={mainContentRef}
          id="main-content"
          className="flex-1 overflow-auto p-4 lg:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {commandOpen && (
        <CommandPalette
          navItems={navItems}
          onClose={closeCommandPalette}
          accent={accent}
        />
      )}
    </div>
  )
}

function CommandPalette({ navItems, onClose, accent }: { navItems: NavSection[]; onClose: () => void; accent: RoleAccent }) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()

  const allItems = navItems.flatMap((s) => s.items)
  const filtered = query
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleSelect = (href: string) => {
    router.push(href)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      handleSelect(filtered[activeIndex].href)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onKeyDown={handleKeyDown}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg rounded-2xl border bg-card shadow-2xl overflow-hidden"
      >
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 h-12 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search pages"
          />
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        {filtered.length > 0 ? (
          <ul ref={listRef} className="max-h-72 overflow-y-auto p-2" role="listbox">
            {filtered.map((item, i) => (
              <li
                key={item.href}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                  i === activeIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                )}
                onClick={() => handleSelect(item.href)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.href}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No pages found for &ldquo;{query}&rdquo;
          </div>
        )}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd> Open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
