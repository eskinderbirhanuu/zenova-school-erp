"use client"

import { useState, type ReactNode, useEffect } from "react"
import { Search, Plus, SlidersHorizontal, Download, LayoutGrid, List } from "lucide-react"
import { Input } from "./input"
import { Button } from "./button"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { EmptyState } from "./empty-state"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
  sortable?: boolean
  mobileLabel?: string
  mobileHidden?: boolean
}

interface GenericListPageProps<T> {
  title: string
  description?: string
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  error?: string
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onRowClick?: (item: T) => void
  onCreateLabel?: string
  onCreateClick?: () => void
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
  extraFilters?: ReactNode
  periods?: { label: string; value: string }[]
  selectedPeriod?: string
  onPeriodChange?: (period: string) => void
  mobileCardRender?: (item: T) => ReactNode
  selectable?: boolean
  selectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  onExport?: () => void
  caption?: string
  totalItems?: number
}

export function GenericListPage<T>({
  title, description, columns, data, keyExtractor,
  loading, error, searchPlaceholder = "Search...",
  onSearch, onRowClick,
  onCreateLabel, onCreateClick,
  emptyTitle, emptyDescription, actions, extraFilters,
  periods, selectedPeriod, onPeriodChange,
  mobileCardRender, selectable, selectedKeys, onSelectionChange,
  onExport, caption, totalItems,
}: GenericListPageProps<T>) {
  const [searchInput, setSearchInput] = useState("")
  const [mounted, setMounted] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => { setMounted(true) }, [])

  const handleSearch = (val: string) => {
    setSearchInput(val)
    onSearch?.(val)
  }

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -8 } as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0.4, ease: "easeOut" as const },
      }

  return (
    <div className="space-y-5">
      <motion.div
        {...animationProps}
        className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary)/3%,transparent_60%)] pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {totalItems != null && (
              <p className="text-xs text-muted-foreground">{totalItems} items</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            {extraFilters && (
              <Button variant="outline" size="sm" onClick={() => setShowFilters((f) => !f)} className="gap-1.5 sm:hidden">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
            )}
            {onCreateClick && (
              <Button onClick={onCreateClick} className="shadow-md shadow-primary/20" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />{onCreateLabel || "Create"}
              </Button>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-3">
          {onSearch && (
            <div className="relative group max-w-md flex-1 min-w-[200px]">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  className="pl-10 pr-4 h-10 bg-background/80 backdrop-blur-sm border-border/60 rounded-xl shadow-sm
                    focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200
                    placeholder:text-muted-foreground/60"
                  placeholder={searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  aria-label={`Search ${title}`}
                />
              </div>
            </div>
          )}

          {periods && onPeriodChange && (
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5" role="radiogroup" aria-label="Select time period">
              {periods.map((p: any) => (
                <button
                  key={p.value}
                  role="radio"
                  aria-checked={selectedPeriod === p.value}
                  onClick={() => onPeriodChange(p.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    selectedPeriod === p.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {extraFilters && (
            <div className={cn("flex items-center gap-2 flex-wrap", !showFilters && "hidden sm:flex")}>
              {extraFilters}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {[1, 2, 3].map((i: any) => (
              <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState variant="error" title="Error" description={error} />
          </motion.div>
        ) : data.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState
              title={emptyTitle || "No items found"}
              description={emptyDescription}
              action={onCreateClick ? { label: onCreateLabel || "Create", onClick: onCreateClick } : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={keyExtractor}
              onRowClick={onRowClick}
              selectable={selectable}
              selectedKeys={selectedKeys}
              onSelectionChange={onSelectionChange}
              mobileCardRender={mobileCardRender}
              caption={caption || title}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
