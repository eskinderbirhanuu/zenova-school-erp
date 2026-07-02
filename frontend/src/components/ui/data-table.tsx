"use client"

import { type ReactNode, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc" | null

interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
  sortable?: boolean
  mobileLabel?: string
  mobileHidden?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  selectable?: boolean
  selectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  mobileCardRender?: (item: T) => ReactNode
  caption?: string
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectable,
  selectedKeys,
  onSelectionChange,
  mobileCardRender,
  caption,
  emptyMessage,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"))
        return key
      }
      setSortDir("asc")
      return key
    })
    if (sortKey !== key) {
      setSortDir("asc")
    }
  }, [sortKey])

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === "desc" ? -cmp : cmp
    })
  }, [data, sortKey, sortDir])

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange || !selectable) return
    if (selectedKeys?.size === data.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(data.map(keyExtractor)))
    }
  }, [data, keyExtractor, onSelectionChange, selectable, selectedKeys])

  const toggleSelect = useCallback((key: string) => {
    if (!onSelectionChange || !selectable) return
    const next = new Set(selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectionChange(next)
  }, [selectedKeys, onSelectionChange, selectable])

  const allSelected = selectable && data.length > 0 && selectedKeys?.size === data.length

  const toggleExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visibleColumns = columns.filter((c) => !c.mobileHidden)

  return (
    <div className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.01]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {caption && <caption className="sr-only">{caption}</caption>}

      <div className="hidden md:block relative">
        <table className="w-full" role={selectable ? "grid" : "table"} aria-label={caption || "Data table"}>
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              {selectable && (
                <th className="w-12 px-3 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.className ?? ""}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      aria-label={`Sort by ${col.header}`}
                      aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none") : "none"}
                    >
                      {col.header}
                      {sortKey === col.key && sortDir === "asc" && <ArrowUp className="h-3 w-3" />}
                      {sortKey === col.key && sortDir === "desc" && <ArrowDown className="h-3 w-3" />}
                      {sortKey !== col.key && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage || "No data available"}
                </td>
              </tr>
            ) : (
              sortedData.map((item, idx) => {
                const key = keyExtractor(item)
                const isSelected = selectedKeys?.has(key)
                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.3) }}
                    className={cn(
                      "group border-b border-border/30 last:border-0 transition-all duration-150",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-primary/5",
                      "hover:bg-gradient-to-r hover:from-primary/[0.04] hover:via-primary/[0.02] hover:to-transparent"
                    )}
                    onClick={() => onRowClick?.(item)}
                    aria-selected={isSelected}
                    role={selectable ? "row" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        onRowClick(item)
                      }
                    }}
                  >
                    {selectable && (
                      <td className="w-12 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          aria-label={`Select row ${key}`}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 text-sm ${col.className ?? ""}`}>
                        {col.render(item)}
                      </td>
                    ))}
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-border/30">
        {sortedData.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {emptyMessage || "No data available"}
          </div>
        ) : (
          sortedData.map((item) => {
            const key = keyExtractor(item)
            const isExpanded = expandedRows.has(key)
            return (
              <div
                key={key}
                className={cn(
                  "relative transition-colors",
                  onRowClick && "cursor-pointer",
                  selectedKeys?.has(key) && "bg-primary/5"
                )}
                onClick={() => {
                  if (mobileCardRender) toggleExpand(key)
                  else onRowClick?.(item)
                }}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    onRowClick(item)
                  }
                }}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    {visibleColumns.slice(0, 3).map((col) => (
                      <div key={col.key} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0 w-20">{col.mobileLabel || col.header}</span>
                        <span className="text-sm font-medium truncate">{col.render(item)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={selectedKeys?.has(key)}
                        onChange={() => toggleSelect(key)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select row ${key}`}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    )}
                    {mobileCardRender && (
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && mobileCardRender && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 border-t border-border/20 pt-2">
                        {mobileCardRender(item)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>

      {selectable && selectedKeys && selectedKeys.size > 0 && (
        <div className="relative border-t bg-muted/30 px-5 py-2.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedKeys.size} of {data.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectionChange?.(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
